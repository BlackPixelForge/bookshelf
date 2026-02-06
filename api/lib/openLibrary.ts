import { OpenLibrarySearchResponse, OpenLibraryWork } from './types';

const BASE_URL = 'https://openlibrary.org';

export interface SearchResult {
  key: string;
  title: string;
  authors: string[];
  publicationYear: number | null;
  isbn: string | null;
  genres: string[];
  coverUrl: string | null;
}

function mapWorkToSearchResult(work: OpenLibraryWork): SearchResult {
  const coverUrl = work.cover_i
    ? `https://covers.openlibrary.org/b/id/${work.cover_i}-M.jpg`
    : null;

  return {
    key: work.key,
    title: work.title,
    authors: work.author_name || [],
    publicationYear: work.first_publish_year || null,
    isbn: work.isbn?.[0] || null,
    genres: (work.subject || []).slice(0, 5),
    coverUrl,
  };
}

export async function searchBooks(query: string, limit = 20): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `${BASE_URL}/search.json?q=${encodedQuery}&limit=${limit}&fields=key,title,author_name,first_publish_year,isbn,subject,cover_i`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open Library API error: ${response.status}`);
  }

  const data = await response.json() as OpenLibrarySearchResponse;
  return data.docs.map(mapWorkToSearchResult);
}

export async function searchByISBN(isbn: string): Promise<SearchResult | null> {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  const url = `${BASE_URL}/search.json?isbn=${cleanISBN}&limit=1&fields=key,title,author_name,first_publish_year,isbn,subject,cover_i`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open Library API error: ${response.status}`);
  }

  const data = await response.json() as OpenLibrarySearchResponse;
  if (data.docs.length === 0) {
    return null;
  }

  return mapWorkToSearchResult(data.docs[0]);
}
