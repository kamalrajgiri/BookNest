
import { apiRequest } from './api';

import type {
  Wishlist,
  WishlistMessageResponse,
  WishlistResponse,
} from '../types/wishlist';

export async function getWishlist(): Promise<Wishlist> {
  const response = await apiRequest<WishlistResponse>('/wishlist');
  return response.data;
}

export async function addWishlistItem(bookId: number): Promise<void> {
  await apiRequest<WishlistMessageResponse>('/wishlist/items', {
    method: 'POST',
    body: { bookId },
  });
}

export async function removeWishlistItem(itemId: number): Promise<void> {
  await apiRequest<WishlistMessageResponse>(`/wishlist/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function clearWishlist(): Promise<void> {
  await apiRequest<WishlistMessageResponse>('/wishlist', {
    method: 'DELETE',
  });
}
