import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, SearchResult } from '../api/client';
import { SearchBar } from '../components/SearchBar';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingBooks, setSavingBooks] = useState<Set<string>>(new Set());
  const [savedBooks, setSavedBooks] = useState<Set<string>>(new Set());

  async function handleSearch(searchQuery: string) {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.searchBooks(searchQuery);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBook(book: SearchResult) {
    if (savingBooks.has(book.key)) return;

    setSavingBooks((prev) => new Set(prev).add(book.key));
    try {
      await api.addBook({
        open_library_key: book.key,
        title: book.title,
        authors: book.authors,
        publication_year: book.publicationYear || undefined,
        isbn_13: book.isbn || undefined,
        genres: book.genres,
        cover_url: book.coverUrl || undefined,
      });
      setSavedBooks((prev) => new Set(prev).add(book.key));
    } catch (err) {
      console.error('Failed to add book:', err);
    } finally {
      setSavingBooks((prev) => {
        const next = new Set(prev);
        next.delete(book.key);
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </Link>
            <div className="flex-1 max-w-xl">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSearch={handleSearch}
                placeholder="Search Open Library for books..."
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <p className="text-red-600">{error}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {query ? 'No books found' : 'Search for books to add to your collection'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>

            <div className="grid gap-4">
              {results.map((book) => {
                const isSaving = savingBooks.has(book.key);
                const isSaved = savedBooks.has(book.key);

                return (
                  <div
                    key={book.key}
                    className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4"
                  >
                    <div className="w-20 flex-shrink-0">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full rounded shadow"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-gray-100 rounded flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{book.title}</h3>
                      {book.authors.length > 0 && (
                        <p className="text-sm text-gray-600">
                          {book.authors.join(', ')}
                        </p>
                      )}
                      {book.publicationYear && (
                        <p className="text-sm text-gray-500">{book.publicationYear}</p>
                      )}
                      {book.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {book.genres.slice(0, 3).map((genre, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleAddBook(book)}
                        disabled={isSaving || isSaved}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          isSaved
                            ? 'bg-green-100 text-green-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                        }`}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isSaved ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {isSaved ? 'Added' : 'Add'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
