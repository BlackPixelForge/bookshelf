import { VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';
import { withAuth } from '../lib/auth';
import { AuthRequest, Book, Tag } from '../lib/types';

const VALID_STATUSES = ['unread', 'in_progress', 'completed'];

async function getBooks(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;
  const { status, tag, q } = req.query;

  // Validate query params
  if (status && !VALID_STATUSES.includes(status as string)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await sql`
      SELECT DISTINCT b.* FROM books b
      ${tag ? sql`JOIN book_tags bt ON b.id = bt.book_id` : sql``}
      WHERE b.user_id = ${userId}
      ${status ? sql`AND b.status = ${status}` : sql``}
      ${tag ? sql`AND bt.tag_id = ${Number(tag)}` : sql``}
      ${q ? sql`AND (b.title ILIKE ${'%' + q + '%'} OR b.authors::text ILIKE ${'%' + q + '%'})` : sql``}
      ORDER BY b.added_at DESC
    `;

    const books = result as Book[];

    if (books.length === 0) {
      return res.json([]);
    }

    // Fetch all tags for all books in a single query (fixes N+1)
    const bookIds = books.map(b => b.id);
    const allTags = await sql`
      SELECT bt.book_id, t.id, t.name, t.color
      FROM tags t
      JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.book_id = ANY(${bookIds})
    `;

    // Group tags by book_id
    const tagsByBookId = new Map<number, Tag[]>();
    for (const row of allTags) {
      const tags = tagsByBookId.get(row.book_id as number) || [];
      tags.push({ id: row.id as number, user_id: 0, name: row.name as string, color: row.color as string });
      tagsByBookId.set(row.book_id as number, tags);
    }

    const booksWithTags = books.map((book) => ({
      ...book,
      tags: tagsByBookId.get(book.id) || [],
    }));

    return res.json(booksWithTags);
  } catch (error) {
    console.error('Error fetching books:', error);
    return res.status(500).json({ error: 'Failed to fetch books' });
  }
}

async function addBook(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;
  const {
    title,
    authors,
    open_library_key,
    publication_year,
    isbn_13,
    genres,
    cover_url,
    status,
    rating,
    notes,
    tags,
  } = req.body;

  // Input validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status must be one of: unread, in_progress, completed' });
  }
  if (rating !== undefined && rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }
  if (authors !== undefined && !Array.isArray(authors)) {
    return res.status(400).json({ error: 'Authors must be an array' });
  }
  if (genres !== undefined && !Array.isArray(genres)) {
    return res.status(400).json({ error: 'Genres must be an array' });
  }

  try {
    const result = await sql`
      INSERT INTO books (
        user_id, title, authors, open_library_key, publication_year,
        isbn_13, genres, cover_url, status, rating, notes
      ) VALUES (
        ${userId}, ${title}, ${JSON.stringify(authors || [])}, ${open_library_key || null},
        ${publication_year || null}, ${isbn_13 || null}, ${JSON.stringify(genres || [])},
        ${cover_url || null}, ${status || 'unread'}, ${rating || null}, ${notes || null}
      )
      RETURNING *
    `;

    const book = result[0] as Book;

    // Add tags if provided — verify ownership first
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const ownedTags = await sql`
        SELECT id FROM tags WHERE id = ANY(${tags}) AND user_id = ${userId}
      `;
      const ownedTagIds = new Set(ownedTags.map((t: any) => t.id));

      for (const tagId of tags) {
        if (ownedTagIds.has(tagId)) {
          await sql`
            INSERT INTO book_tags (book_id, tag_id)
            VALUES (${book.id}, ${tagId})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }

    // Fetch tags
    const tagsResult = await sql`
      SELECT t.id, t.name, t.color
      FROM tags t
      JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.book_id = ${book.id}
    `;

    return res.status(201).json({
      ...book,
      tags: tagsResult as Tag[],
    });
  } catch (error) {
    console.error('Error adding book:', error);
    return res.status(500).json({ error: 'Failed to add book' });
  }
}

export default withAuth(async (req: AuthRequest, res: VercelResponse) => {
  if (req.method === 'GET') {
    return getBooks(req, res);
  } else if (req.method === 'POST') {
    return addBook(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
});
