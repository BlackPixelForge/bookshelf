# Bookshelf — Codebase Review

Comprehensive review of problems, database issues, security vulnerabilities, and areas for improvement.

---

## Critical Issues

### 1. Cookie `Max-Age` Uses Milliseconds Instead of Seconds (Bug)

**File:** `api/lib/auth.ts:75`

The `setCookie` function builds a raw `Set-Cookie` header string using `cookieOptions.maxAge`, which is defined as `7 * 24 * 60 * 60 * 1000` (604,800,000 milliseconds). The HTTP `Max-Age` directive is specified in **seconds**, not milliseconds. This results in auth cookies persisting for ~19.2 years instead of the intended 7 days.

```typescript
// Line 37: maxAge is in milliseconds (for Express compatibility)
maxAge: 7 * 24 * 60 * 60 * 1000, // 604800000

// Line 75: but Max-Age in Set-Cookie headers expects seconds
const cookieString = `...Max-Age=${options.maxAge}...`;
// Produces: Max-Age=604800000 (~19.2 years instead of 7 days)
```

The Express backend is not affected because `res.cookie()` auto-converts from milliseconds. This bug is **production-only** (Vercel).

**Fix:** Divide by 1000: `Max-Age=${Math.floor(options.maxAge / 1000)}`, or define a separate seconds-based value for the raw header.

---

### 2. `JSON.stringify(null)` Produces `"null"` String, Corrupting Data

**File:** `api/books/[id].ts:68`

```typescript
authors = COALESCE(${JSON.stringify(authors || null)}, authors),
```

When `authors` is `undefined`, `authors || null` evaluates to `null`, and `JSON.stringify(null)` produces the **string** `"null"` — not SQL NULL. Postgres stores this as valid JSONB (`null` literal), so `COALESCE` sees it as non-null and **overwrites** the existing authors. Sending an update request without an `authors` field silently destroys the stored authors data. Same issue applies to `genres`.

**Fix:** Check explicitly: `authors !== undefined ? JSON.stringify(authors) : null`.

---

### 3. No Input Validation on Vercel Production Endpoints

**Files:** `api/books/index.ts`, `api/books/[id].ts`, `api/tags/index.ts`, `api/tags/[id].ts`, `api/auth/register.ts`

The Express backend uses `express-validator` to validate email format, password length, status enum values, rating range (1–5), tag color hex format, and tag name length. The Vercel serverless functions — which serve **production** — perform almost none of this validation:

| Field | Express (dev) | Vercel (prod) |
|-------|--------------|---------------|
| Email format | `isEmail().normalizeEmail()` | Truthy check only |
| Status values | `isIn(['unread','in_progress','completed'])` | No validation |
| Rating range | `isInt({ min: 1, max: 5 })` | No validation |
| Tag color | `matches(/^#[0-9A-Fa-f]{6}$/)` | No validation |
| Tag name length | `isLength({ max: 50 })` | No validation |

Production accepts `status: 'garbage'`, `rating: 99`, or megabyte-long tag names.

---

### 4. Hardcoded JWT Secret Fallback

**Files:** `api/lib/auth.ts:6`, `server/src/services/auth.ts:4`

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'bookshelf-secret-change-in-production';
```

If `JWT_SECRET` is unset in production, all tokens are signed with a publicly visible string. An attacker can forge valid JWTs for any user. The app should refuse to start without this variable in production.

---

### 5. No Rate Limiting on Vercel Auth Endpoints

**Files:** `api/auth/register.ts`, `api/auth/login.ts`

The Express server applies rate limiting (10 requests / 15 minutes) to auth routes. The Vercel serverless functions have **zero** rate limiting. Production is fully exposed to brute-force password attacks and registration spam.

---

## Database Issues

### 6. N+1 Query Problem Fetching Tags

**Files:** `api/books/index.ts:47-61`, `server/src/routes/books.ts:58-66`

For every book returned, a separate query fetches its tags. With 100 books, this executes 101 queries. In Vercel's serverless environment, each query is an HTTP round-trip to Neon's proxy, making this especially costly.

**Fix:** Use a single query with `LEFT JOIN` and aggregate tags, or use a subquery:
```sql
SELECT b.*, json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color)) as tags
FROM books b
LEFT JOIN book_tags bt ON b.id = bt.book_id
LEFT JOIN tags t ON bt.tag_id = t.id
WHERE b.user_id = $1
GROUP BY b.id
```

---

### 7. No Transactions for Multi-Statement Book Operations

**Files:** `api/books/index.ts:91-113`, `api/books/[id].ts:64-87`

Book updates delete all `book_tags` rows then re-insert them one by one, without a transaction. If the process fails between the delete and re-insert, tags are permanently lost. Similarly, book creation inserts the book then inserts tags individually — a failure mid-way leaves orphaned books without their intended tags.

---

### 8. Missing Tag Ownership Verification

**Files:** `api/books/index.ts:107`, `api/books/[id].ts:80`, `server/src/routes/books.ts:189`

When associating tags with books, neither backend verifies that the tag IDs belong to the authenticated user:

```typescript
for (const tagId of tags) {
  await sql`INSERT INTO book_tags (book_id, tag_id) VALUES (${book.id}, ${tagId})`;
}
```

A user can associate their books with another user's tag IDs. The tag data (name, color) then leaks in API responses since the tag-fetch queries don't filter by `user_id`.

---

### 9. No Pagination / Unbounded Queries

**Files:** `api/books/index.ts:34-42`, `server/src/routes/books.ts:29-52`

The book list endpoint has no `LIMIT` clause. All matching books are returned in a single response. Combined with the N+1 tag queries, a user with thousands of books can trigger massive database load and very large response payloads.

---

### 10. `COALESCE` Misuse Prevents Clearing Fields

**File:** `api/books/[id].ts:67-71`

```typescript
title = COALESCE(${title || null}, title),
status = COALESCE(${status || null}, status),
rating = COALESCE(${rating !== undefined ? rating : null}, rating),
notes = COALESCE(${notes !== undefined ? notes : null}, notes)
```

- `title || null` treats empty string as `null`, making it impossible to clear a title.
- `rating` uses `!== undefined` but `COALESCE(null, rating)` preserves the old value, making it impossible to **clear** a rating (set it to null).
- The Express backend doesn't have this issue — it builds UPDATE queries dynamically with only provided fields.

---

### 11. Race Condition in Registration (Check-Then-Insert)

**Files:** `api/auth/register.ts:23-35`, `server/src/routes/auth.ts:27-37`

Registration checks if an email exists, then inserts. Two concurrent requests with the same email both pass the check; one hits the `UNIQUE` constraint and returns a generic 500 error instead of the correct "Email already registered" 400 response. Especially likely in the Vercel serverless environment.

**Fix:** Use `INSERT ... ON CONFLICT` or wrap in a transaction, and handle the unique constraint violation specifically.

---

### 12. SQLite Statement Leak on Error

**File:** `server/src/config/db.ts:118-137`

`getOne` and `getAll` call `stmt.bind()` and `stmt.step()` without a `try/finally` block. If either throws, `stmt.free()` is never called and the prepared statement leaks.

**Fix:** Wrap in `try/finally`:
```typescript
const stmt = database.prepare(sql);
try {
  stmt.bind(params);
  // ... step and read
} finally {
  stmt.free();
}
```

---

### 13. SQLite Full-Database Write on Every Mutation

**File:** `server/src/config/db.ts:92-98, 114`

Every `runQuery` call exports the entire database and writes it synchronously to disk with `fs.writeFileSync`. This blocks the event loop, is not atomic (crash during write corrupts the file), and multi-step operations (book update + tag reassignment) serialize the full database 3+ times.

---

### 14. `initDatabase()` Silently Swallows Schema Errors

**File:** `api/lib/db.ts:75-78`

```typescript
} catch (error) {
    console.error('Database initialization error:', error);
    // Don't throw - tables might already exist
}
```

Every `CREATE TABLE` uses `IF NOT EXISTS`, so "table already exists" errors cannot occur. This catch swallows genuine errors (permission denied, connection failures), causing the app to start with a broken database and fail with confusing errors on every subsequent query.

---

### 15. Dead Code in `getBooks`

**File:** `api/books/index.ts:11-32`

Lines 11–32 build a `query` variable and `conditions` array that are **never used**. The actual query starts at line 34. This dead code executes template literals (potentially triggering unused query preparation) and creates maintenance confusion.

---

### 16. Missing `CHECK` Constraints

**Files:** `api/lib/db.ts:38-39`, `server/src/config/db.ts:50-51`

Neither schema constrains `status` to valid enum values or `rating` to 1–5 at the database level. Combined with the missing Vercel input validation (Issue #3), invalid values can be stored.

---

## Security Vulnerabilities

### 17. Cookie Parser Truncates Values Containing `=`

**File:** `api/lib/auth.ts:50-53`

```typescript
const [key, value] = cookie.trim().split('=');
```

`split('=')` returns all segments, but destructuring only captures the first two. A cookie value containing `=` (valid in cookie values) is truncated. While base64url-encoded JWTs typically don't have `=` padding, this is fragile and would break with any cookie containing `=`.

**Fix:** Split on the first `=` only: `const [key, ...rest] = cookie.trim().split('='); const value = rest.join('=');`

---

### 18. No JWT Algorithm Restriction on Verify

**Files:** `api/lib/auth.ts:27`, `server/src/services/auth.ts:25`

```typescript
return jwt.verify(token, JWT_SECRET) as { id: number; email: string };
```

No `algorithms` whitelist is passed to `jwt.verify()`. Best practice is `{ algorithms: ['HS256'] }` to prevent algorithm confusion attacks.

---

### 19. Cookie Clearing Omits Security Attributes

**File:** `api/lib/auth.ts:80-82`

```typescript
res.setHeader('Set-Cookie', `${name}=; Path=/; Max-Age=0`);
```

The clear directive omits `HttpOnly`, `Secure`, and `SameSite` attributes that were used when setting the cookie. Some browsers may not match the clear directive if attributes differ, leaving the cookie intact after logout.

---

### 20. No Server-Side Token Revocation

**Files:** `api/auth/logout.ts`, `server/src/routes/auth.ts:93`

Logout only clears the client-side cookie. The JWT remains valid until its 7-day expiration (or 19 years per Issue #1). A stolen token continues to work after logout. Combined with the cookie max-age bug, this significantly extends the window of compromise.

---

### 21. User Enumeration via Registration

**Files:** `api/auth/register.ts:24`, `server/src/routes/auth.ts:28-29`

Both backends return `"Email already registered"` for duplicate emails, allowing attackers to probe which email addresses have accounts.

---

### 22. ISBN Parameter Injection in Open Library URLs

**Files:** `api/lib/openLibrary.ts:44-46`, `server/src/services/openLibrary.ts:44-46`

```typescript
const cleanISBN = isbn.replace(/[-\s]/g, '');
const url = `${BASE_URL}/search.json?isbn=${cleanISBN}&limit=1&fields=...`;
```

The ISBN is only stripped of hyphens and whitespace, then interpolated into the URL without `encodeURIComponent()`. Characters like `&` or `#` can inject additional query parameters.

---

### 23. `me` Endpoint Accepts All HTTP Methods

**File:** `api/auth/me.ts:5-7`

The `/api/auth/me` Vercel endpoint responds to any HTTP method. The Express backend correctly restricts to GET only.

---

## Client-Side Issues

### 24. Race Condition in `useBooks` Hook

**File:** `client/src/hooks/useBooks.ts:15-30`

When filters change rapidly, multiple concurrent `fetchBooks` calls fire with no `AbortController`. Whichever request finishes last wins, regardless of whether it corresponds to the current filter state — producing stale data in the UI.

---

### 25. Silent Error Swallowing

**Files:** `client/src/pages/Bookshelf.tsx:43`, `client/src/pages/Search.tsx:56`, `client/src/components/BookModal.tsx:47,59`

Multiple operations catch errors but only `console.error` them:
- Failed tag loading → filter panel silently shows no tags
- Failed book addition → "Add" button resets with no feedback
- Failed book save → modal closes, user believes save succeeded
- Failed book delete → no indication to the user

---

### 26. API Error Parsing Crashes on Non-JSON Responses

**File:** `client/src/api/client.ts:25-27`

```typescript
if (!response.ok) {
  const error: ApiError = await response.json();
  throw new Error(error.error || 'Request failed');
}
```

If the server returns a non-JSON error body (502 from a proxy, HTML error page), `response.json()` throws a `SyntaxError` with an unhelpful message like `"Unexpected token <"`.

**Fix:** Wrap in try/catch:
```typescript
if (!response.ok) {
  let message = 'Request failed';
  try {
    const error = await response.json();
    message = error.error || message;
  } catch {}
  throw new Error(message);
}
```

---

### 27. Unvalidated External Image URLs

**Files:** `client/src/components/BookCard.tsx:27`, `client/src/components/BookModal.tsx:82`, `client/src/pages/Search.tsx:126`

`cover_url` from the API is rendered directly as `<img src>` with no validation of scheme or domain. While the URLs originate from Open Library, if book data were manipulated, arbitrary URLs (tracking pixels, internal network addresses) could be loaded.

---

## Consistency Issues Between Backends

### 28. Vercel vs Express Parity Gaps

The two backends implement the same API but have significant behavioral differences:

| Aspect | Express (dev) | Vercel (prod) |
|--------|--------------|---------------|
| Input validation | `express-validator` | Minimal/none |
| Rate limiting | 10 req/15 min on auth | None |
| Cookie parsing | `cookie-parser` middleware | Manual parser (buggy) |
| `me` endpoint methods | GET only | All methods |
| Error response format | `{ errors: [...] }` for validation | `{ error: "string" }` for all |
| JSONB parsing | Manual `JSON.parse()` | Relies on Neon driver |
| Book update logic | Dynamic field building | `COALESCE` pattern (buggy) |
| Timestamp format | SQLite `YYYY-MM-DD HH:MM:SS` | Postgres ISO 8601 |

---

## Summary by Priority

**Fix immediately (production bugs / security):**
1. Cookie Max-Age milliseconds → seconds (Issue #1)
2. `JSON.stringify(null)` data corruption (Issue #2)
3. Add input validation to Vercel endpoints (Issue #3)
4. Fail on missing JWT_SECRET in production (Issue #4)
5. Add rate limiting to Vercel auth (Issue #5)
6. Fix tag ownership verification (Issue #8)
7. Fix cookie parser `=` handling (Issue #17)

**Fix soon (data integrity / reliability):**
8. Add transactions for multi-statement operations (Issue #7)
9. Fix N+1 queries (Issue #6)
10. Fix COALESCE field clearing logic (Issue #10)
11. Handle registration race condition (Issue #11)
12. Fix SQLite statement leaks (Issue #12)
13. Fix initDatabase error swallowing (Issue #14)

**Improve (robustness / quality):**
14. Add pagination (Issue #9)
15. Add JWT algorithm restriction (Issue #18)
16. Fix cookie clearing attributes (Issue #19)
17. Add client-side error feedback (Issue #25)
18. Handle non-JSON error responses (Issue #26)
19. Remove dead code (Issue #15)
20. Add CHECK constraints (Issue #16)
