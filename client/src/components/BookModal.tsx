import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Book, Tag, BookInput } from '../api/client';
import { X, Star, Trash2, BookOpen, Clock, CheckCircle, Loader2 } from 'lucide-react';

interface BookModalProps {
  book: Book | null;
  tags: Tag[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, updates: Partial<BookInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const statuses = [
  { value: 'unread', label: 'Unread', icon: BookOpen },
  { value: 'in_progress', label: 'Reading', icon: Clock },
  { value: 'completed', label: 'Completed', icon: CheckCircle },
] as const;

export function BookModal({ book, tags, isOpen, onClose, onSave, onDelete }: BookModalProps) {
  const [status, setStatus] = useState<Book['status']>('unread');
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (book) {
      setStatus(book.status);
      setRating(book.rating);
      setNotes(book.notes || '');
      setSelectedTags(book.tags.map((t) => t.id));
    }
  }, [book]);

  if (!book) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(book!.id, { status, rating: rating ?? undefined, notes, tags: selectedTags });
      onClose();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(book!.id);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function toggleTag(tagId: number) {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-gray-900 rounded-xl shadow-xl border border-gray-800 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start gap-4 p-6">
            <div className="w-32 flex-shrink-0">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full rounded-lg shadow"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gray-800 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-gray-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <Dialog.Title className="text-xl font-semibold text-gray-100">
                    {book.title}
                  </Dialog.Title>
                  {book.authors.length > 0 && (
                    <p className="text-gray-400 mt-1">{book.authors.join(', ')}</p>
                  )}
                  {book.publication_year && (
                    <p className="text-sm text-gray-500">{book.publication_year}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {book.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {book.genres.map((genre, i) => (
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
          </div>

          <div className="px-6 pb-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <div className="flex gap-2">
                {statuses.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setStatus(value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      status === value
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400'
                        : 'border-gray-700 hover:border-gray-600 text-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(rating === star ? null : star)}
                    className="p-1"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        rating && star <= rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-600 hover:text-yellow-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors`}
                      style={
                        selectedTags.includes(tag.id)
                          ? { backgroundColor: tag.color, color: 'white' }
                          : { backgroundColor: tag.color + '20', color: tag.color }
                      }
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Add your notes about this book..."
              />
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-800">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-400">Delete this book?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
