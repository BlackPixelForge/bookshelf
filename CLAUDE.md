# Bookshelf — Project Guide

Personal book collection manager. Users search for books via the Open Library API, add them to their shelves, and organize with tags, ratings, notes, and reading status.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + React Router 6
- **Backend (production)**: Vercel Serverless Functions (in `/api`)
- **Backend (local dev)**: Express.js 4 (in `/server`)
- **Database (production)**: Neon PostgreSQL via `@neondatabase/serverless`
- **Database (local dev)**: SQLite via `sql.js` (file at `/app/data/bookshelf.db`)
- **Auth**: Custom JWT (7-day expiry) stored in httpOnly cookies, bcrypt (12 rounds)
- **UI Libraries**: Headless UI, Lucide React icons

## Project Structure

```
bookshelf/
├── api/                  # Vercel serverless functions (PRODUCTION)
│   ├── lib/
│   │   ├── db.ts         # Neon connection + schema init (initDatabase)
│   │   ├── auth.ts       # JWT helpers, withAuth middleware, cookie utils
│   │   ├── types.ts      # AuthRequest, Book, Tag interfaces
│   │   └── openLibrary.ts
│   ├── auth/             # register.ts, login.ts, logout.ts, me.ts
│   ├── books/            # index.ts (list/create), [id].ts (get/update/delete)
│   ├── tags/             # index.ts (list/create), [id].ts (update/delete)
│   └── search/           # index.ts (search), isbn/[isbn].ts
│
├── server/               # Express server (LOCAL DEV ONLY)
│   └── src/
│       ├── config/db.ts  # SQLite setup via sql.js
│       ├── middleware/    # auth.ts, errorHandler.ts
│       ├── routes/       # auth.ts, books.ts, tags.ts, search.ts
│       ├── services/     # openLibrary.ts
│       └── types/        # index.ts
│
├── client/               # React SPA
│   └── src/
│       ├── api/client.ts     # ApiClient class (fetch wrapper)
│       ├── context/AuthContext.tsx
│       ├── hooks/useAuth.ts, useBooks.ts
│       ├── pages/Bookshelf.tsx, Login.tsx, Register.tsx, Search.tsx
│       ├── components/BookCard, BookGrid, BookModal, FilterPanel,
│       │               SearchBar, TagManager, AuthForms
│       ├── App.tsx       # Router setup
│       └── main.tsx      # Entry point
│
├── vercel.json           # Rewrites, build config (output: client/dist)
├── Dockerfile            # Multi-stage build for Docker deployment
├── docker-compose.yml    # Docker with volume for SQLite
└── package.json          # Root: shared deps (neon, bcryptjs, jwt)
```

## Database Schema

Four tables with relational integrity:

- **users**: id, email (unique), password_hash, created_at
- **books**: id, user_id (FK→users CASCADE), open_library_key, title, authors (JSONB), publication_year, isbn_13, genres (JSONB), cover_url, status ('unread'|'in_progress'|'completed'), rating (1-5), notes, added_at
- **tags**: id, user_id (FK→users CASCADE), name, color (default '#6366f1'), UNIQUE(user_id, name)
- **book_tags**: book_id (FK→books CASCADE), tag_id (FK→tags CASCADE), composite PK

Indexes: `idx_books_user_id`, `idx_books_status` (user_id, status), `idx_tags_user_id`

## Key Patterns

- **Dual backend**: `/api` (Vercel prod) and `/server` (local dev) implement the same API with different DB drivers. Both must stay in sync when making changes.
- **Raw SQL everywhere**: No ORM. Neon uses tagged template literals (`sql\`...\``), SQLite uses `?` parameter binding.
- **Auth flow**: Register/login → server sets `auth_token` httpOnly cookie → `withAuth` middleware reads cookie, verifies JWT, attaches `req.user` → all book/tag routes are protected.
- **Data isolation**: Every query includes `WHERE user_id = ?` — users can only access their own data.
- **Book search**: Queries Open Library API externally, no DB involvement. Users explicitly add results to their collection.
- **Authors/genres**: Stored as JSON arrays in JSONB (Postgres) / JSON text (SQLite), parsed on retrieval.
- **Tags**: Many-to-many via `book_tags` junction table. Tag mutations delete and re-insert associations.

## Commands

```bash
# Local development
npm run install-all          # Install root + server + client deps
cd server && npm run dev     # Start Express server (port 3001)
cd client && npm run dev     # Start Vite dev server (port 5173, proxies /api → 3001)

# Build
cd client && npm run build   # TypeScript check + Vite build → client/dist/

# Docker
docker-compose up --build    # Full app on port 3001
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` or `POSTGRES_URL` | Production | Neon PostgreSQL connection string |
| `JWT_SECRET` | All envs | Secret for signing JWTs (default fallback exists for dev) |
| `NODE_ENV` | Production | Set to `production` for secure cookies |

## Security Features

- Bcrypt (12 rounds) for password hashing
- httpOnly + Secure + SameSite=strict cookies
- Rate limiting on auth routes (10 req / 15 min)
- Parameterized queries throughout (no SQL injection)
- Helmet security headers (Express server)
- Input validation via express-validator
- Ownership checks on all data-mutating endpoints

## Deployment

**Vercel** (primary): Neon integration via Vercel marketplace. `vercel.json` configures rewrites from REST paths to serverless function files. Client builds to `client/dist`.

**Docker** (alternative): Multi-stage Dockerfile, SQLite-based, volume mount for persistence.

## No Real-Time Features

The app uses standard HTTP request/response only. No WebSockets, SSE, polling, or real-time subscriptions. Single-user-per-account model with no collaboration features.
