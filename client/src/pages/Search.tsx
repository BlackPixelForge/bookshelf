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
  const [failedBooks, setFailedBooks] = useState<Map<string, string>>(new Map());

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
      setFailedBooks((prev) => {
        const next = new Map(prev);
        next.set(book.key, err instanceof Error ? err.message : 'Failed to add book');
        return next;
      });
    } finally {
      setSavingBooks((prev) => {
        const next = new Set(prev);
        next.delete(book.key);
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200"
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
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">
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
                const addError = failedBooks.get(book.key);

                return (
                  <div
                    key={book.key}
                    className="bg-gray-900 rounded-lg border border-gray-800 p-4 flex gap-4"
                  >
                    <div className="w-20 flex-shrink-0">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full rounded shadow"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-gray-800 rounded flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-gray-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-100">{book.title}</h3>
                      {book.authors.length > 0 && (
                        <p className="text-sm text-gray-400">
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
                              className="px-2 py-0.5 text-xs bg-gray-800 text-gray-400 rounded"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <button
                        onClick={() => handleAddBook(book)}
                        disabled={isSaving || isSaved}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          isSaved
                            ? 'bg-green-900/40 text-green-400'
                            : addError
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                        }`}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isSaved ? (
                          <Check className="h-4 w-4" />
                        ) : addError ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {isSaved ? 'Added' : addError ? 'Retry' : 'Add'}
                      </button>
                      {addError && (
                        <p className="text-xs text-red-400 max-w-[150px] text-right">{addError}</p>
                      )}
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
