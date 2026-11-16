
export interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  price: string;
  stock: number;
  rating: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BookPagination {
  currentPage: number;
  pageSize: number;
  totalBooks: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface BooksResponse {
  message: string;
  data: Book[];
  pagination: BookPagination;
}

export interface BookQueryParams {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  limit?: number;
}
