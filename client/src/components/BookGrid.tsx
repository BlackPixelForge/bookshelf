import { Book } from '../api/client';
import { BookCard } from './BookCard';
import { Loader2, BookX } from 'lucide-react';

interface BookGridProps {
  books: Book[];
  loading: boolean;
  error: string | null;
  onBookClick: (book: Book) => void;
}

export function BookGrid({ books, loading, error, onBookClick }: BookGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-12">
        <BookX className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No books found</p>
        <p className="text-sm text-gray-400 mt-1">
          Search for books to add them to your collection
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {books.map((book) => (
        <BookCard key={book.id} book={book} onClick={() => onBookClick(book)} />
      ))}
    </div>
  );
}
