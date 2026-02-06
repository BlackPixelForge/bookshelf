import { useState, useEffect, useCallback, useRef } from 'react';
import { api, Book, BookInput } from '../api/client';

interface UseBooksOptions {
  status?: string;
  tag?: number;
  q?: string;
}

export function useBooks(options: UseBooksOptions = {}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchBooks = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBooks(options);
      // Only update state if this is still the latest request
      if (requestId === requestIdRef.current) {
        setBooks(data);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch books');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [options.status, options.tag, options.q]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const addBook = async (book: BookInput) => {
    const newBook = await api.addBook(book);
    setBooks((prev) => [newBook, ...prev]);
    return newBook;
  };

  const updateBook = async (id: number, updates: Partial<BookInput>) => {
    const updated = await api.updateBook(id, updates);
    setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)));
    return updated;
  };

  const deleteBook = async (id: number) => {
    await api.deleteBook(id);
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  return {
    books,
    loading,
    error,
    refresh: fetchBooks,
    addBook,
    updateBook,
    deleteBook,
  };
}
