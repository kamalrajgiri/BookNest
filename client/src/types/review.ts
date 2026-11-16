
export interface Review {
  id: number;
  userId: number;
  bookId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  User: {
    id: number;
    name: string;
  };
}

export interface ReviewPagination {
  page: number;
  limit: number;
  totalReviews: number;
  totalPages: number;
}

export interface ReviewsResponse {
  message: string;
  data: Review[];
  pagination: ReviewPagination;
}

export interface ReviewResponse {
  message: string;
  data: Review;
}

export interface ReviewMessageResponse {
  message: string;
}
