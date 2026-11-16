
import { apiRequest } from './api';
import type {
    Book,
  BooksResponse,
  BookQueryParams,
} from '../types/book';

interface BookResponse {
  message: string;
  data: Book;
}

export async function getBooks(
  params: BookQueryParams = {}
): Promise<BooksResponse> {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set('search', params.search.trim());
  }

  if (params.minPrice !== undefined) {
    query.set('minPrice', String(params.minPrice));
  }

  if (params.maxPrice !== undefined) {
    query.set('maxPrice', String(params.maxPrice));
  }

  if (params.minRating !== undefined) {
    query.set('minRating', String(params.minRating));
  }

  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }

  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }

  const queryString = query.toString();
  const endpoint = queryString
    ? `/books?${queryString}`
    : '/books';

  return apiRequest<BooksResponse>(endpoint);
}

export async function getBookById(id: number): Promise<Book> {
  const response = await apiRequest<BookResponse>(`/books/${id}`);
  return response.data;
}



export interface BookInput {
  title: string;
  author: string;
  description: string;
  price: number;
  stock: number;
}

export async function createBook(data: BookInput): Promise<Book> {
  const response = await apiRequest<BookResponse>('/books', {
    method: 'POST',
    body: data,
  });

  return response.data;
}

export async function updateBook(
  id: number,
  data: Partial<BookInput>,
): Promise<Book> {
  const response = await apiRequest<BookResponse>(`/books/${id}`, {
    method: 'PATCH',
    body: data,
  });

  return response.data;
}

export async function deleteBook(id: number): Promise<void> {
  await apiRequest(`/books/${id}`, {
    method: 'DELETE',
  });
}

