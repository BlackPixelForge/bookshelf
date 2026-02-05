# Vercel Deployment Guide

This guide will help you deploy your Bookshelf app to Vercel with Neon Postgres.

## Prerequisites

- A Vercel account (sign up at https://vercel.com)
- A Neon account (sign up at https://neon.tech) - FREE tier available
- GitHub repository (already set up at BlackPixelForge/bookshelf)

## Quick Deploy (Easiest Method)

### Step 1: Deploy to Vercel

1. Click this button or visit https://vercel.com/new
2. Import your `BlackPixelForge/bookshelf` repository
3. Vercel will automatically detect the configuration
4. **Don't deploy yet** - we need to add environment variables first

### Step 2: Create Neon Postgres Database

1. Go to https://console.neon.tech
2. Click "Create Project"
3. Choose a name (e.g., "bookshelf-db")
4. Select a region close to you
5. Click "Create Project"
6. Copy the connection string (it starts with `postgresql://`)

### Step 3: Configure Environment Variables in Vercel

In your Vercel project settings (before deploying), add these environment variables:

1. Go to "Settings" → "Environment Variables"
2. Add the following:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string (from Step 2) |
| `JWT_SECRET` | Generate with: `openssl rand -base64 32` |
| `NODE_ENV` | `production` |

**Important**: Make sure to select "Production", "Preview", and "Development" for all variables.

### Step 4: Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete (2-3 minutes)
3. Your app will be available at `https://your-project.vercel.app`

### Step 5: Initialize Database (Automatic)

The database tables will be created automatically on first deployment. No manual SQL needed!

### Step 6: Test Your App

1. Visit your deployment URL
2. Click "Sign up" to create an account
3. Search for books and add them to your collection

## Manual Database Setup (Optional)

If automatic initialization doesn't work, you can create tables manually:

1. Go to https://console.neon.tech
2. Select your project
3. Click "SQL Editor"
4. Run this SQL:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  open_library_key TEXT,
  title TEXT NOT NULL,
  authors JSONB,
  publication_year INTEGER,
  isbn_13 TEXT,
  genres JSONB,
  cover_url TEXT,
  status TEXT DEFAULT 'unread',
  rating INTEGER,
  notes TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  UNIQUE(user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS book_tags (
  book_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (book_id, tag_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
```

## Vercel Integration (Alternative to Manual Setup)

You can also use Vercel's Neon integration:

1. In Vercel, go to your project
2. Go to "Storage" → "Create Database"
3. Choose "Neon" from the marketplace
4. Click "Continue"
5. This will automatically:
   - Create a Neon database
   - Add the `DATABASE_URL` environment variable
   - Connect everything

## Troubleshooting

### Database Connection Issues

**Error**: "DATABASE_URL environment variable is required"
- **Fix**: Make sure you added `DATABASE_URL` in Vercel's environment variables
- Check that it's enabled for Production, Preview, and Development

**Error**: "Connection timeout"
- **Fix**: Check your Neon project is active (free tier sleeps after inactivity)
- Visit Neon console to wake it up

### API Errors

1. Check Vercel Function logs:
   - Go to your Vercel project
   - Click "Deployments"
   - Click on your deployment
   - Click "Functions" to see logs

2. Common issues:
   - Missing environment variables
   - Database connection string format
   - JWT_SECRET not set

### Build Failures

**Error**: "Module not found"
- **Fix**: Make sure all dependencies are in package.json
- Try redeploying

**Error**: "Build timed out"
- **Fix**: This is rare, just redeploy

## Custom Domain (Optional)

1. In Vercel, go to "Settings" → "Domains"
2. Add your domain
3. Update DNS records as instructed by Vercel
4. Wait for DNS propagation (5-30 minutes)

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | Neon Postgres connection URL | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | Yes | Secret for JWT signing (32+ chars) | `your-random-secret-here` |
| `NODE_ENV` | Yes | Environment mode | `production` |

## Automatic Deployments

Every push to your `main` branch will automatically trigger a new deployment on Vercel.

To disable this:
1. Go to "Settings" → "Git"
2. Uncheck "Production Branch"

## Monitoring & Logs

- **Function Logs**: Vercel Dashboard → Your Project → Functions
- **Database Monitoring**: Neon Console → Your Project → Monitoring
- **Analytics**: Vercel Dashboard → Your Project → Analytics

## Free Tier Limits

**Neon Free Tier:**
- 0.5 GB storage
- 1 project
- Unlimited databases per project
- 100 hours/month compute time

**Vercel Free Tier:**
- 100 GB bandwidth/month
- 100 GB-hrs serverless function execution
- Unlimited static sites

## Support

- **Vercel Issues**: https://github.com/vercel/vercel/discussions
- **Neon Issues**: https://github.com/neondatabase/neon/discussions
- **App Issues**: https://github.com/BlackPixelForge/bookshelf/issues
