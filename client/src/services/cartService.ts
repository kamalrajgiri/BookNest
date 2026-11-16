
import { apiRequest } from './api';

import type {
  Cart,
  CartItem,
  CartMessageResponse,
  CartResponse,
  CartItemResponse,
} from '../types/cart';

export async function getCart(): Promise<Cart> {
  const response = await apiRequest<CartResponse>('/cart');
  return response.data;
}

export async function addCartItem(
  bookId: number,
  quantity = 1
): Promise<CartItem> {
  const response = await apiRequest<CartItemResponse>('/cart/items', {
    method: 'POST',
    body: { bookId, quantity },
  });

  return response.data;
}

export async function updateCartItem(
  itemId: number,
  quantity: number
): Promise<CartItem> {
  const response = await apiRequest<CartItemResponse>(
    `/cart/items/${itemId}`,
    {
      method: 'PATCH',
      body: { quantity },
    }
  );

  return response.data;
}

export async function removeCartItem(
  itemId: number
): Promise<void> {
  await apiRequest<CartMessageResponse>(`/cart/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function clearCart(): Promise<void> {
  await apiRequest<CartMessageResponse>('/cart', {
    method: 'DELETE',
  });
}
