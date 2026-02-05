# Bookshelf - Personal Book Collection Manager

A self-hosted web application for managing your personal book collection with Open Library API integration.

## Features

- **User Authentication**: Secure login/register with JWT tokens stored in httpOnly cookies
- **Open Library Search**: Search millions of books via the Open Library API
- **Collection Management**: Track reading status (unread, in progress, completed)
- **Ratings & Notes**: Rate books 1-5 stars and add personal notes
- **Custom Tags**: Create and assign custom colored tags to organize your collection
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite with better-sqlite3
- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI, Lucide icons

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Development Setup

1. Clone the repository:
```bash
cd bookshelf
```

2. Install server dependencies and start the backend:
```bash
cd server
npm install
npm run dev
```

3. In a new terminal, install client dependencies and start the frontend:
```bash
cd client
npm install
npm run dev
```

4. Open http://localhost:5173 in your browser

### Production Build

```bash
# Build server
cd server
npm run build

# Build client
cd ../client
npm run build
```

## Docker Deployment

Build and run with Docker:

```bash
docker build -t bookshelf .
docker run -p 3001:3001 -v bookshelf-data:/app/data bookshelf
```

Or with docker-compose:

```yaml
version: '3.8'
services:
  bookshelf:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - bookshelf-data:/app/data
    environment:
      - JWT_SECRET=your-secret-key-change-this
      - NODE_ENV=production

volumes:
  bookshelf-data:
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `JWT_SECRET` | Secret key for JWT signing | (dev default, change in production) |
| `NODE_ENV` | Environment mode | development |
| `CLIENT_URL` | Frontend URL for CORS | http://localhost:5173 |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Books
- `GET /api/books` - List books (supports `?status=`, `?tag=`, `?q=` filters)
- `GET /api/books/:id` - Get book details
- `POST /api/books` - Add book to collection
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Remove book

### Search
- `GET /api/search?q=` - Search Open Library
- `GET /api/search/isbn/:isbn` - Search by ISBN

### Tags
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag

## Project Structure

```
bookshelf/
├── server/
│   ├── src/
│   │   ├── index.ts          # Express app entry
│   │   ├── config/db.ts      # SQLite connection
│   │   ├── middleware/       # Auth & error handling
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   └── types/            # TypeScript types
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.tsx           # Main app component
│   │   ├── api/client.ts     # API client
│   │   ├── components/       # React components
│   │   ├── context/          # Auth context
│   │   ├── hooks/            # Custom hooks
│   │   └── pages/            # Page components
│   └── package.json
├── Dockerfile
└── README.md
```

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT stored in httpOnly cookies (not localStorage)
- CSRF protection via SameSite=Strict
- Rate limiting on auth endpoints
- Input validation with express-validator
- Parameterized SQL queries

## License

MIT
