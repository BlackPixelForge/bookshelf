const API_BASE = '/api';

interface ApiError {
  error: string;
  errors?: { msg: string; path: string }[];
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      let message = 'Request failed';
      try {
        const error: ApiError = await response.json();
        message = error.error || message;
      } catch {
        // Non-JSON error response (e.g. 502 gateway error)
      }
      throw new Error(message);
    }

    return response.json();
  }

  // Auth
  async register(email: string, password: string) {
    return this.request<{ user: { id: number; email: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ user: { id: number; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout', { method: 'POST' });
  }

  async getCurrentUser() {
    return this.request<{ user: { id: number; email: string } }>('/auth/me');
  }

  // Books
  async getBooks(params?: { status?: string; tag?: number; q?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.tag) searchParams.set('tag', params.tag.toString());
    if (params?.q) searchParams.set('q', params.q);

    const query = searchParams.toString();
    return this.request<Book[]>(`/books${query ? `?${query}` : ''}`);
  }

  async getBook(id: number) {
    return this.request<Book>(`/books/${id}`);
  }

  async addBook(book: BookInput) {
    return this.request<Book>('/books', {
      method: 'POST',
      body: JSON.stringify(book),
    });
  }

  async updateBook(id: number, updates: Partial<BookInput>) {
    return this.request<Book>(`/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteBook(id: number) {
    return this.request<{ message: string }>(`/books/${id}`, { method: 'DELETE' });
  }

  // Search
  async searchBooks(query: string) {
    return this.request<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`);
  }

  async searchByISBN(isbn: string) {
    return this.request<SearchResult>(`/search/isbn/${encodeURIComponent(isbn)}`);
  }

  // Tags
  async getTags() {
    return this.request<Tag[]>('/tags');
  }

  async createTag(name: string, color?: string) {
    return this.request<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
  }

  async updateTag(id: number, updates: { name?: string; color?: string }) {
    return this.request<Tag>(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTag(id: number) {
    return this.request<{ message: string }>(`/tags/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// Types
export interface Book {
  id: number;
  user_id: number;
  open_library_key: string | null;
  title: string;
  authors: string[];
  publication_year: number | null;
  isbn_13: string | null;
  genres: string[];
  cover_url: string | null;
  status: 'unread' | 'in_progress' | 'completed';
  rating: number | null;
  notes: string | null;
  added_at: string;
  tags: Tag[];
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

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
}

export interface SearchResult {
  key: string;
  title: string;
  authors: string[];
  publicationYear: number | null;
  isbn: string | null;
  genres: string[];
  coverUrl: string | null;
}
