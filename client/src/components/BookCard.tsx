import { Book } from '../api/client';
import { BookOpen, Star, Clock, CheckCircle } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

const statusConfig = {
  unread: { label: 'Unread', icon: BookOpen, color: 'bg-gray-700 text-gray-300' },
  in_progress: { label: 'Reading', icon: Clock, color: 'bg-yellow-900/40 text-yellow-400' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-green-900/40 text-green-400' },
};

export function BookCard({ book, onClick }: BookCardProps) {
  const status = statusConfig[book.status];
  const StatusIcon = status.icon;

  return (
    <div
      onClick={onClick}
      className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 hover:bg-gray-900/80 transition-all"
    >
      <div className="aspect-[2/3] bg-gray-800 relative">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-gray-600" />
          </div>
        )}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-100 line-clamp-2 mb-1">{book.title}</h3>
        {book.authors.length > 0 && (
          <p className="text-sm text-gray-400 line-clamp-1">
            {book.authors.join(', ')}
          </p>
        )}

        {book.rating && (
          <div className="flex items-center mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= book.rating! ? 'text-yellow-400 fill-current' : 'text-gray-600'
                }`}
              />
            ))}
          </div>
        )}

        {book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {book.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 text-xs rounded-full"
                style={{ backgroundColor: tag.color + '20', color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {book.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400">
                +{book.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
