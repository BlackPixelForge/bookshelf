import { VercelResponse } from '@vercel/node';
import { sql, initDatabase } from '../lib/db';
import { withAuth } from '../lib/auth';
import { AuthRequest, Book, Tag } from '../lib/types';

async function getBook(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;
  const bookId = Number(req.query.id);

  if (!bookId) {
    return res.status(400).json({ error: 'Book ID required' });
  }

  try {
    await initDatabase();
    const result = await sql`
      SELECT * FROM books WHERE id = ${bookId} AND user_id = ${userId}
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = result[0] as Book;

    const tagsResult = await sql`
      SELECT t.id, t.name, t.color
      FROM tags t
      JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.book_id = ${bookId}
    `;

    return res.json({
      ...book,
      tags: tagsResult as Tag[],
    });
  } catch (error) {
    console.error('Error fetching book:', error);
    return res.status(500).json({ error: 'Failed to fetch book' });
  }
}

async function updateBook(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;
  const bookId = Number(req.query.id);

  if (!bookId) {
    return res.status(400).json({ error: 'Book ID required' });
  }

  const { title, authors, status, rating, notes, tags } = req.body;

  // Input validation
  const VALID_STATUSES = ['unread', 'in_progress', 'completed'];
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status must be one of: unread, in_progress, completed' });
  }
  if (rating !== undefined && rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }
  if (authors !== undefined && !Array.isArray(authors)) {
    return res.status(400).json({ error: 'Authors must be an array' });
  }

  try {
    await initDatabase();
    // Check ownership
    const existing = await sql`
      SELECT id FROM books WHERE id = ${bookId} AND user_id = ${userId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Build dynamic update
    const setClauses: string[] = [];
    const setValues: any[] = [];

    if (title !== undefined) { setClauses.push('title'); setValues.push(title); }
    if (authors !== undefined) { setClauses.push('authors'); setValues.push(JSON.stringify(authors)); }
    if (status !== undefined) { setClauses.push('status'); setValues.push(status); }
    if (rating !== undefined) { setClauses.push('rating'); setValues.push(rating); }
    if (notes !== undefined) { setClauses.push('notes'); setValues.push(notes); }

    if (setClauses.length > 0) {
      // Use individual field updates to avoid COALESCE issues
      for (let i = 0; i < setClauses.length; i++) {
        const field = setClauses[i];
        const value = setValues[i];
        if (field === 'title') await sql`UPDATE books SET title = ${value} WHERE id = ${bookId}`;
        else if (field === 'authors') await sql`UPDATE books SET authors = ${value} WHERE id = ${bookId}`;
        else if (field === 'status') await sql`UPDATE books SET status = ${value} WHERE id = ${bookId}`;
        else if (field === 'rating') await sql`UPDATE books SET rating = ${value} WHERE id = ${bookId}`;
        else if (field === 'notes') await sql`UPDATE books SET notes = ${value} WHERE id = ${bookId}`;
      }
    }

    // Update tags if provided — verify ownership
    if (tags !== undefined && Array.isArray(tags)) {
      await sql`DELETE FROM book_tags WHERE book_id = ${bookId}`;

      if (tags.length > 0) {
        const ownedTags = await sql`
          SELECT id FROM tags WHERE id = ANY(${tags}) AND user_id = ${userId}
        `;
        const ownedTagIds = new Set(ownedTags.map((t: any) => t.id));

        for (const tagId of tags) {
          if (ownedTagIds.has(tagId)) {
            await sql`
              INSERT INTO book_tags (book_id, tag_id)
              VALUES (${bookId}, ${tagId})
              ON CONFLICT DO NOTHING
            `;
          }
        }
      }
    }

    // Fetch updated book
    const result = await sql`SELECT * FROM books WHERE id = ${bookId}`;
    const book = result[0] as Book;

    const tagsResult = await sql`
      SELECT t.id, t.name, t.color
      FROM tags t
      JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.book_id = ${bookId}
    `;

    return res.json({
      ...book,
      tags: tagsResult as Tag[],
    });
  } catch (error) {
    console.error('Error updating book:', error);
    return res.status(500).json({ error: 'Failed to update book' });
  }
}

async function deleteBook(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;
  const bookId = Number(req.query.id);

  if (!bookId) {
    return res.status(400).json({ error: 'Book ID required' });
  }

  try {
    await initDatabase();
    const result = await sql`
      DELETE FROM books WHERE id = ${bookId} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    return res.json({ message: 'Book deleted' });
  } catch (error) {
    console.error('Error deleting book:', error);
    return res.status(500).json({ error: 'Failed to delete book' });
  }
}

export default withAuth(async (req: AuthRequest, res: VercelResponse) => {
  if (req.method === 'GET') {
    return getBook(req, res);
  } else if (req.method === 'PUT') {
    return updateBook(req, res);
  } else if (req.method === 'DELETE') {
    return deleteBook(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
});
