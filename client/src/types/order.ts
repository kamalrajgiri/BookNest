
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed';

export interface CreatedOrderItem {
  bookId: number;
  bookTitle: string;
  unitPrice: string;
  quantity: number;
}

export interface CreatedOrder {
  id: number;
  totalAmount: string;
  currency: string;
  status: OrderStatus;
  items: CreatedOrderItem[];
  paymentStatus: PaymentStatus;
}

export interface CreateOrderResponse {
  message: string;
  data: CreatedOrder;
}

export interface OrderBook {
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

export interface OrderItem {
  id: number;
  orderId: number;
  bookId: number;
  bookTitle: string;
  unitPrice: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  Book: OrderBook;
}

export interface OrderPayment {
  id: number;
  orderId: number;
  amount: string;
  provider: 'khalti';
  transactionId: string | null;
  status: PaymentStatus;
  paymentUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  pidx: string | null;
}

export interface Order {
  id: number;
  userId: number;
  totalAmount: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  OrderItems: OrderItem[];
  Payment: OrderPayment;
  User?: {
  id: number;
  name: string;
  email: string;
};
}

export interface OrdersResponse {
  message: string;
  currency: string;
  data: Order[];
}

export interface OrderResponse {
  message: string;
  data: Order;
}

export interface OrderMessageResponse {
  message: string;
}

export interface KhaltiInitiateResponse {
  message: string;
  data: {
    orderId: number;
    pidx: string;
    paymentUrl: string;
    expiresAt: string;
    expiresIn: number;
  };
}

export interface KhaltiVerificationResponse {
  message: string;
  data: {
    orderId: number;
    paymentStatus: PaymentStatus;
    orderStatus?: OrderStatus;
    khaltiStatus?: string;
    transactionId?: string;
    currency?: string;
  };
}