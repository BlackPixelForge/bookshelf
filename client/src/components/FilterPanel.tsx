import { Tag } from '../api/client';
import { BookOpen, Clock, CheckCircle, Filter } from 'lucide-react';

interface FilterPanelProps {
  statusFilter: string | null;
  tagFilter: number | null;
  tags: Tag[];
  onStatusChange: (status: string | null) => void;
  onTagChange: (tagId: number | null) => void;
}

const statuses = [
  { value: 'unread', label: 'Unread', icon: BookOpen },
  { value: 'in_progress', label: 'Reading', icon: Clock },
  { value: 'completed', label: 'Completed', icon: CheckCircle },
];

export function FilterPanel({
  statusFilter,
  tagFilter,
  tags,
  onStatusChange,
  onTagChange,
}: FilterPanelProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
        <Filter className="h-4 w-4" />
        Filters
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Status
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onStatusChange(null)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                statusFilter === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {statuses.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => onStatusChange(statusFilter === value ? null : value)}
                className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1 transition-colors ${
                  statusFilter === value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onTagChange(null)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  tagFilter === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => onTagChange(tagFilter === tag.id ? null : tag.id)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors`}
                  style={
                    tagFilter === tag.id
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
      </div>
    </div>
  );
}
