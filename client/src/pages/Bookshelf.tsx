import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, Book, Tag, BookInput } from '../api/client';
import { useBooks } from '../hooks/useBooks';
import { BookGrid } from '../components/BookGrid';
import { BookModal } from '../components/BookModal';
import { FilterPanel } from '../components/FilterPanel';
import { SearchBar } from '../components/SearchBar';
import { TagManager } from '../components/TagManager';
import { Search, Tags, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Bookshelf() {
  const { logout } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);

  const options = useMemo(
    () => ({
      status: statusFilter || undefined,
      tag: tagFilter || undefined,
      q: searchQuery || undefined,
    }),
    [statusFilter, tagFilter, searchQuery]
  );

  const { books, loading, error, updateBook, deleteBook } = useBooks(options);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    try {
      const data = await api.getTags();
      setTags(data);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }

  async function handleSaveBook(id: number, updates: Partial<BookInput>) {
    await updateBook(id, updates);
  }

  async function handleDeleteBook(id: number) {
    await deleteBook(id);
  }

  async function handleCreateTag(name: string, color: string) {
    const tag = await api.createTag(name, color);
    setTags((prev) => [...prev, tag]);
  }

  async function handleUpdateTag(id: number, name: string, color: string) {
    const tag = await api.updateTag(id, { name, color });
    setTags((prev) => prev.map((t) => (t.id === id ? tag : t)));
  }

  async function handleDeleteTag(id: number) {
    await api.deleteTag(id);
    setTags((prev) => prev.filter((t) => t.id !== id));
    if (tagFilter === id) setTagFilter(null);
  }

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <span className="text-xl font-semibold text-gray-900">Bookshelf</span>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/search"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Search className="h-4 w-4" />
                Add Books
              </Link>
              <button
                onClick={() => setShowTagManager(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Tags className="h-4 w-4" />
                Tags
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 space-y-4">
          <div className="max-w-md">
            <SearchBar
              value={localSearch}
              onChange={setLocalSearch}
              onSearch={setSearchQuery}
              placeholder="Search your collection..."
            />
          </div>

          <FilterPanel
            statusFilter={statusFilter}
            tagFilter={tagFilter}
            tags={tags}
            onStatusChange={setStatusFilter}
            onTagChange={setTagFilter}
          />
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500">
            {books.length} book{books.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>

        <BookGrid
          books={books}
          loading={loading}
          error={error}
          onBookClick={setSelectedBook}
        />
      </main>

      <BookModal
        book={selectedBook}
        tags={tags}
        isOpen={!!selectedBook}
        onClose={() => setSelectedBook(null)}
        onSave={handleSaveBook}
        onDelete={handleDeleteBook}
      />

      <TagManager
        tags={tags}
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        onCreate={handleCreateTag}
        onUpdate={handleUpdateTag}
        onDelete={handleDeleteTag}
      />
    </div>
  );
}
