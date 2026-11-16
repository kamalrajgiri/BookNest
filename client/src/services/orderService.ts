
import { apiRequest } from './api';
import type {
  CreateOrderResponse,
  OrdersResponse,
  OrderResponse,
  OrderMessageResponse,
} from '../types/order';

import type {
  KhaltiInitiateResponse,
  KhaltiVerificationResponse,
} from '../types/order';

export async function createOrder(): Promise<CreateOrderResponse> {
  return apiRequest<CreateOrderResponse>('/orders', {
    method: 'POST',
  });
}

export async function getOrders(): Promise<OrdersResponse> {
  return apiRequest<OrdersResponse>('/orders');
}

export async function getOrderById(
  orderId: number
): Promise<OrderResponse> {
  return apiRequest<OrderResponse>(`/orders/${orderId}`);
}

export async function cancelOrder(
  orderId: number
): Promise<OrderMessageResponse> {
  return apiRequest<OrderMessageResponse>(
    `/orders/${orderId}/cancel`,
    {
      method: 'PATCH',
    }
  );
}

export async function updateOrderStatus(
  orderId: number,
  status: 'processing' | 'shipped' | 'delivered'
): Promise<OrderResponse> {
  return apiRequest<OrderResponse>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export async function initiateKhaltiPayment(
  orderId: number
): Promise<KhaltiInitiateResponse> {
  return apiRequest<KhaltiInitiateResponse>(
    `/orders/${orderId}/pay`,
    { method: 'POST' }
  );
}

export async function verifyKhaltiPayment(
  orderId: number
): Promise<KhaltiVerificationResponse> {
  return apiRequest<KhaltiVerificationResponse>(
    `/orders/${orderId}/verify-payment`,
    { method: 'POST' }
  );
}