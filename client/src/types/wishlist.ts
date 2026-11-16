
import type { Book } from './book';

export interface WishlistItem {
  id: number;
  wishlistId: number;
  bookId: number;
  createdAt: string;
  updatedAt: string;
  Book: Book | null;
}

export interface Wishlist {
  id: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  WishlistItems: WishlistItem[];
}

export interface WishlistResponse {
  message: string;
  data: Wishlist;
}

export interface WishlistMessageResponse {
  message: string;
}
