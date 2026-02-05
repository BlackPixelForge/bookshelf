import { VercelRequest } from '@vercel/node';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface Book {
  id: number;
  user_id: number;
  open_library_key: string | null;
  title: string;
  authors: string[] | null;
  publication_year: number | null;
  isbn_13: string | null;
  genres: string[] | null;
  cover_url: string | null;
  status: 'unread' | 'in_progress' | 'completed';
  rating: number | null;
  notes: string | null;
  added_at: string;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
}

export interface AuthRequest extends VercelRequest {
  user?: {
    id: number;
    email: string;
  };
}

export interface OpenLibraryWork {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  subject?: string[];
  cover_i?: number;
}

export interface OpenLibrarySearchResponse {
  numFound: number;
  docs: OpenLibraryWork[];
}

export interface BookInput {
  open_library_key?: string;
  title: string;
  authors?: string[];
  publication_year?: number;
  isbn_13?: string;
  genres?: string[];
  cover_url?: string;
  status?: 'unread' | 'in_progress' | 'completed';
  rating?: number;
  notes?: string;
  tags?: number[];
}
