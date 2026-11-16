
import type { Book } from './book';

export interface CartItem {
  id: number;
  cartId: number;
  bookId: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  Book: Book;
}

export interface Cart {
  id: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  CartItems: CartItem[];
}

export interface CartResponse {
  message: string;
  data: Cart;
}

export interface CartItemResponse {
  message: string;
  data: CartItem;
}

export interface CartMessageResponse {
  message: string;
}
