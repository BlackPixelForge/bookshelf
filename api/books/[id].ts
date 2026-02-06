import { VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';
import { withAuth } from '../lib/auth';
import { AuthRequest, Book, Tag } from '../lib/types';

async function getBook(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;
  const bookId = Number(req.query.id);

  if (!bookId) {
    return res.status(400).json({ error: 'Book ID required' });
  }

  try {
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

  try {
    // Check ownership
    const existing = await sql`
      SELECT id FROM books WHERE id = ${bookId} AND user_id = ${userId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Update book fields
    if (title !== undefined || authors !== undefined || status !== undefined || rating !== undefined || notes !== undefined) {
      await sql`
        UPDATE books
        SET
          title = COALESCE(${title || null}, title),
          authors = COALESCE(${JSON.stringify(authors || null)}, authors),
          status = COALESCE(${status || null}, status),
          rating = COALESCE(${rating !== undefined ? rating : null}, rating),
          notes = COALESCE(${notes !== undefined ? notes : null}, notes)
        WHERE id = ${bookId}
      `;
    }

    // Update tags if provided
    if (tags !== undefined && Array.isArray(tags)) {
      await sql`DELETE FROM book_tags WHERE book_id = ${bookId}`;

      for (const tagId of tags) {
        await sql`
          INSERT INTO book_tags (book_id, tag_id)
          VALUES (${bookId}, ${tagId})
          ON CONFLICT DO NOTHING
        `;
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
