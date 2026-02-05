import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Tag } from '../api/client';
import { X, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface TagManagerProps {
  tags: Tag[];
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (id: number, name: string, color: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const colorOptions = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6b7280', // gray
];

export function TagManager({
  tags,
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: TagManagerProps) {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(colorOptions[0]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  async function handleCreate() {
    if (!newTagName.trim()) return;
    setLoading(true);
    try {
      await onCreate(newTagName.trim(), newTagColor);
      setNewTagName('');
      setNewTagColor(colorOptions[0]);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(tag: Tag) {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  async function handleUpdate() {
    if (!editingTag || !editName.trim()) return;
    setLoading(true);
    try {
      await onUpdate(editingTag.id, editName.trim(), editColor);
      setEditingTag(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    setLoading(true);
    try {
      await onDelete(id);
      setDeleteConfirm(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-xl shadow-xl">
          <div className="flex justify-between items-center p-4 border-b">
            <Dialog.Title className="text-lg font-semibold">Manage Tags</Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create New Tag
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <div className="relative">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                  />
                </div>
                <button
                  onClick={handleCreate}
                  disabled={loading || !newTagName.trim()}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-1 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      newTagColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Tags ({tags.length})
              </label>
              {tags.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No tags yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
                    >
                      {editingTag?.id === tag.id ? (
                        <>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                          />
                          <button
                            onClick={handleUpdate}
                            disabled={loading}
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </button>
                          <button
                            onClick={() => setEditingTag(null)}
                            className="p-1 text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </>
                      ) : deleteConfirm === tag.id ? (
                        <>
                          <span className="flex-1 text-sm text-red-600">Delete "{tag.name}"?</span>
                          <button
                            onClick={() => handleDelete(tag.id)}
                            disabled={loading}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <span
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="flex-1 text-sm">{tag.name}</span>
                          <button
                            onClick={() => startEdit(tag)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(tag.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
