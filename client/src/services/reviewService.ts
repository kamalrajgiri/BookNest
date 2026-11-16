
import { apiRequest } from './api';

import type {
//   Review,
  ReviewsResponse,
  ReviewResponse,
  ReviewMessageResponse,
} from '../types/review';

export interface ReviewQueryParams {
  page?: number;
  limit?: number;
}

export async function getBookReviews(
  bookId: number,
  params: ReviewQueryParams = {}
): Promise<ReviewsResponse> {
  const query = new URLSearchParams();

  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }

  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }

  const queryString = query.toString();

  const endpoint = queryString
    ? `/reviews/books/${bookId}?${queryString}`
    : `/reviews/books/${bookId}`;

  return apiRequest<ReviewsResponse>(endpoint);
}

export async function createReview(data: {
  bookId: number;
  rating: number;
  comment: string | null;
}): Promise<ReviewResponse> {
  return apiRequest<ReviewResponse>('/reviews', {
    method: 'POST',
    body: data,
  });
}

export async function updateReview(
  reviewId: number,
  data: {
    rating?: number;
    comment?: string | null;
  }
): Promise<ReviewResponse> {
  return apiRequest<ReviewResponse>(`/reviews/${reviewId}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function deleteReview(
  reviewId: number
): Promise<ReviewMessageResponse> {
  return apiRequest<ReviewMessageResponse>(`/reviews/${reviewId}`, {
    method: 'DELETE',
  });
}
