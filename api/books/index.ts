import { VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';
import { withAuth } from '../lib/auth';
import { AuthRequest, Book, Tag } from '../lib/types';

async function getBooks(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;
  const { status, tag, q } = req.query;

  try {
    let query = sql`
      SELECT DISTINCT b.* FROM books b
    `;

    const conditions = [sql`b.user_id = ${userId}`];

    if (tag) {
      query = sql`
        SELECT DISTINCT b.* FROM books b
        JOIN book_tags bt ON b.id = bt.book_id
      `;
      conditions.push(sql`bt.tag_id = ${Number(tag)}`);
    }

    if (status) {
      conditions.push(sql`b.status = ${status}`);
    }

    if (q) {
      const searchTerm = `%${q}%`;
      conditions.push(sql`(b.title ILIKE ${searchTerm} OR b.authors::text ILIKE ${searchTerm})`);
    }

    // Combine conditions
    const whereClause = conditions.length > 0
      ? sql` WHERE ${sql.unsafe(conditions.map((_, i) => `condition_${i}`).join(' AND '))}`
      : sql``;

    const result = await sql`
      SELECT DISTINCT b.* FROM books b
      ${tag ? sql`JOIN book_tags bt ON b.id = bt.book_id` : sql``}
      WHERE b.user_id = ${userId}
      ${status ? sql`AND b.status = ${status}` : sql``}
      ${tag ? sql`AND bt.tag_id = ${Number(tag)}` : sql``}
      ${q ? sql`AND (b.title ILIKE ${'%' + q + '%'} OR b.authors::text ILIKE ${'%' + q + '%'})` : sql``}
      ORDER BY b.added_at DESC
    `;

    const books = result.rows as Book[];

    // Fetch tags for each book
    const booksWithTags = await Promise.all(
      books.map(async (book) => {
        const tagsResult = await sql`
          SELECT t.id, t.name, t.color
          FROM tags t
          JOIN book_tags bt ON t.id = bt.tag_id
          WHERE bt.book_id = ${book.id}
        `;

        return {
          ...book,
          tags: tagsResult.rows as Tag[],
        };
      })
    );

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

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
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

    const book = result.rows[0] as Book;

    // Add tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagId of tags) {
        await sql`
          INSERT INTO book_tags (book_id, tag_id)
          VALUES (${book.id}, ${tagId})
          ON CONFLICT DO NOTHING
        `;
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
      tags: tagsResult.rows as Tag[],
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
