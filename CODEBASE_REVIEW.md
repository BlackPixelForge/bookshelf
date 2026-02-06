# Bookshelf — Codebase Review

Comprehensive review of problems, database issues, security vulnerabilities, and areas for improvement.

---

## Fixed Issues

All items below were resolved in commit `b9ed3da`.

### Security (13 fixes)

| # | Issue | Files Changed |
|---|-------|---------------|
| 1 | **Cookie `Max-Age` used milliseconds instead of seconds** — auth cookies persisted ~19.2 years instead of 7 days in production (Vercel). Added `maxAgeSeconds` field and used it in the raw `Set-Cookie` header. | `api/lib/auth.ts` |
| 2 | **Hardcoded JWT secret fallback** — app now throws on startup if `JWT_SECRET` is unset in production instead of falling back to a publicly visible string. | `api/lib/auth.ts`, `server/src/services/auth.ts` |
| 3 | **No JWT algorithm restriction** — added `{ algorithms: ['HS256'] }` to `jwt.verify()` to prevent algorithm confusion attacks. | `api/lib/auth.ts`, `server/src/services/auth.ts` |
| 4 | **Cookie parser truncated values containing `=`** — replaced destructuring `split('=')` with `indexOf`-based parsing that preserves the full value. | `api/lib/auth.ts` |
| 5 | **Cookie clearing omitted security attributes** — `clearCookie` now includes `HttpOnly`, `Secure`, `SameSite` to match the attributes used when setting the cookie. | `api/lib/auth.ts` |
| 6 | **No rate limiting on Vercel auth endpoints** — added in-memory per-IP rate limiter (10 req / 15 min) via new `api/lib/rateLimit.ts`. | `api/lib/rateLimit.ts` (new), `api/auth/register.ts`, `api/auth/login.ts` |
| 7 | **No input validation on Vercel production endpoints** — added validation for email format, status enum, rating range (1–5), tag color hex, tag name length (max 50), password max length (72, bcrypt limit), authors/genres array type. | `api/auth/register.ts`, `api/auth/login.ts`, `api/books/index.ts`, `api/books/[id].ts`, `api/tags/index.ts`, `api/tags/[id].ts` |
| 8 | **User enumeration via registration** — Vercel registration now uses `INSERT ... ON CONFLICT DO NOTHING` and returns a generic error message instead of "Email already registered". Also normalizes email with `toLowerCase().trim()`. | `api/auth/register.ts` |
| 9 | **Tag ownership not verified** — both backends now check that tag IDs belong to the authenticated user before inserting into `book_tags`. | `api/books/index.ts`, `api/books/[id].ts`, `server/src/routes/books.ts` |
| 10 | **ISBN parameter injection** — added `encodeURIComponent()` to ISBN values interpolated into Open Library URLs. | `api/lib/openLibrary.ts`, `server/src/services/openLibrary.ts` |
| 11 | **`/api/auth/me` accepted all HTTP methods** — restricted to GET only. | `api/auth/me.ts` |
| 12 | **Login used `SELECT *` fetching password hash unnecessarily** — changed to `SELECT id, email, password_hash`. | `api/auth/login.ts` |
| 13 | **Error logging leaked full error objects** — changed to log only `(error as Error).message`. | `api/auth/register.ts`, `api/auth/login.ts` |

### Database (7 fixes)

| # | Issue | Files Changed |
|---|-------|---------------|
| 14 | **N+1 query problem fetching tags** — Vercel `getBooks` now fetches all tags for all books in a single query using `WHERE bt.book_id = ANY(${bookIds})` instead of one query per book. | `api/books/index.ts` |
| 15 | **`JSON.stringify(null)` produced `"null"` string, corrupting data** — replaced the `COALESCE` update pattern with explicit per-field `UPDATE` statements. Only fields present in the request body are updated. | `api/books/[id].ts`, `api/tags/[id].ts` |
| 16 | **`COALESCE` misuse prevented clearing fields** — same fix as above; fields like `rating` and `notes` can now be set to `null`/empty. | `api/books/[id].ts` |
| 17 | **Registration race condition (check-then-insert)** — Vercel registration now uses `INSERT ... ON CONFLICT DO NOTHING` + checks `RETURNING` result, eliminating the race. | `api/auth/register.ts` |
| 18 | **SQLite prepared statement leak on error** — wrapped `getOne` and `getAll` in `try/finally` to ensure `stmt.free()` is always called. | `server/src/config/db.ts` |
| 19 | **SQLite writes not atomic** — `saveDatabase()` now writes to a temp file then renames, preventing corruption on crash. | `server/src/config/db.ts` |
| 20 | **`initDatabase()` silently swallowed schema errors** — catch block now re-throws instead of suppressing. All `CREATE TABLE` statements already use `IF NOT EXISTS`. | `api/lib/db.ts` |

### Code Quality (3 fixes)

| # | Issue | Files Changed |
|---|-------|---------------|
| 21 | **Dead code in `getBooks`** — removed unused `query`/`conditions` builder (lines 11–32) that was never referenced. | `api/books/index.ts` |
| 22 | **Missing `CHECK` constraints** — added `CHECK (status IN ('unread','in_progress','completed'))` and `CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))` to both Postgres and SQLite schemas. | `api/lib/db.ts`, `server/src/config/db.ts` |
| 23 | **Vercel vs Express parity gaps** — the fixes above bring the two backends much closer together: both now validate inputs, verify tag ownership, normalize emails, and restrict HTTP methods consistently. | Multiple files |

### Client-Side (3 fixes)

| # | Issue | Files Changed |
|---|-------|---------------|
| 24 | **API error parsing crashed on non-JSON responses** — `response.json()` is now wrapped in try/catch; falls back to generic "Request failed" message. | `client/src/api/client.ts` |
| 25 | **Race condition in `useBooks` hook** — added request ID tracking so only the latest request updates state; stale responses are discarded. | `client/src/hooks/useBooks.ts` |
| 26 | **Silent error swallowing** — BookModal now shows inline error banner on save/delete failure instead of only `console.error`. Search page shows error text and "Retry" button on failed book additions. | `client/src/components/BookModal.tsx`, `client/src/pages/Search.tsx` |

---

## Remaining Issues (for a follow-up PR)

### High Priority

#### 1. No Server-Side Token Revocation

**Files:** `api/auth/logout.ts`, `server/src/routes/auth.ts`

Logout only clears the client-side cookie. A stolen JWT remains valid until its 7-day expiration. Requires:
- A `revoked_tokens` table (token jti + expiry)
- `withAuth` middleware checks against the revocation table
- A scheduled cleanup job to purge expired entries

**Scope:** Architectural — new table, middleware change, cleanup mechanism.

#### 2. Transactions for Multi-Statement Book Operations

**Files:** `api/books/index.ts`, `api/books/[id].ts`, `server/src/routes/books.ts`

Book updates delete all `book_tags` rows then re-insert them without a transaction. A failure between delete and re-insert permanently loses tag associations. Requires:
- Vercel: Use `neon()` pool client with `sql.begin()` or the `@neondatabase/serverless` transaction API
- Express/SQLite: Wrap in `BEGIN`/`COMMIT` using `db.run()`

**Scope:** Moderate — needs careful testing with both database drivers.

#### 3. Pagination for Book List Endpoint

**Files:** `api/books/index.ts`, `server/src/routes/books.ts`, `client/src/hooks/useBooks.ts`, `client/src/pages/Bookshelf.tsx`

The book list has no `LIMIT` clause. A user with thousands of books triggers unbounded queries and massive response payloads. Requires:
- Backend: Add `limit`/`offset` (or cursor-based) query params with a default page size
- Frontend: Pagination UI or infinite scroll in `Bookshelf.tsx`
- Hook: Update `useBooks` to accept and pass pagination params

**Scope:** Coordinated frontend + backend change with new UI.

### Medium Priority

#### 4. N+1 Query in Express Backend (SQLite)

**File:** `server/src/routes/books.ts:58-66`

The Vercel N+1 was fixed, but the Express backend still fetches tags per-book in a loop. SQLite doesn't support `ANY()`, so this needs a different approach:
- Use `WHERE bt.book_id IN (?,?,?...)` with dynamically built placeholders
- Or a single query with `GROUP_CONCAT` to aggregate tags

#### 5. Express Registration Race Condition

**File:** `server/src/routes/auth.ts:27-37`

The Vercel registration was fixed with `INSERT ... ON CONFLICT`, but the Express backend still uses check-then-insert. SQLite supports `INSERT OR IGNORE` or `ON CONFLICT`, so the same pattern can be applied.

#### 6. SQLite Write Batching

**File:** `server/src/config/db.ts`

`saveDatabase()` exports and writes the full database on every `runQuery` call. Multi-step operations (book update + tag reassignment) write 3+ times. Could be improved with:
- A debounced/batched write that coalesces multiple mutations
- Or a `withTransaction` helper that defers `saveDatabase()` until the transaction completes

#### 7. Unvalidated External Image URLs

**Files:** `client/src/components/BookCard.tsx`, `client/src/components/BookModal.tsx`, `client/src/pages/Search.tsx`

`cover_url` from the API is rendered as `<img src>` with no scheme/domain validation. Could add a client-side allowlist (e.g., only `https://covers.openlibrary.org`) or validate on the server when books are added.

#### 8. Tag Loading Error Not Surfaced to User

**File:** `client/src/pages/Bookshelf.tsx:42-44`

If tag loading fails, the filter panel silently shows no tags. Should set an error state and display a message or retry option.

### Low Priority

#### 9. Remaining Backend Parity Gaps

| Aspect | Status |
|--------|--------|
| Error response format (`{ errors: [...] }` vs `{ error: "string" }`) | Still divergent |
| Timestamp format (SQLite `YYYY-MM-DD HH:MM:SS` vs Postgres ISO 8601) | Still divergent |
| JSONB parsing (Express manually `JSON.parse()`, Vercel relies on Neon driver) | Still divergent |

These are inherent to the dual-backend architecture and would require a shared response serialization layer to fully unify.

#### 10. No Secondary CSRF Protection

The app relies solely on `SameSite=strict` cookies. Older browsers without `SameSite` support are unprotected. A CSRF token mechanism would add defense-in-depth.

#### 11. Vercel Rate Limiting Is Per-Instance

The current `api/lib/rateLimit.ts` uses in-memory storage. Each serverless instance has its own counter, so the limit is per-instance rather than global. For true distributed rate limiting, switch to an external store (Vercel KV, Upstash Redis, etc.).

#### 12. `useCallback` Dependency Array in `useBooks`

**File:** `client/src/hooks/useBooks.ts`

The dependency array lists `options.status`, `options.tag`, `options.q` individually rather than the `options` object. If new filter properties are added, they must be manually added to the array or the hook will use stale values.
