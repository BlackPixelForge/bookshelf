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
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-start gap-4 p-6">
            <div className="w-32 flex-shrink-0">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full rounded-lg shadow"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gray-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-gray-300" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    {book.title}
                  </Dialog.Title>
                  {book.authors.length > 0 && (
                    <p className="text-gray-600 mt-1">{book.authors.join(', ')}</p>
                  )}
                  {book.publication_year && (
                    <p className="text-sm text-gray-500">{book.publication_year}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {book.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {book.genres.map((genre, i) => (
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
          </div>

          <div className="px-6 pb-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex gap-2">
                {statuses.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setStatus(value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      status === value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Add your notes about this book..."
              />
            </div>

            <div className="flex justify-between pt-4 border-t">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Delete this book?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
