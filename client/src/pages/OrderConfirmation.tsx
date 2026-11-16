
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getOrderById,
  initiateKhaltiPayment,
} from '../services/orderService';

import type { Order } from '../types/order';
import { useAppSelector } from '../store/hooks';

function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentInitiating, setPaymentInitiating] = useState(false);
    const { user } = useAppSelector((state) => state.auth);

    

  useEffect(() => {
    let isActive = true;

    async function loadOrder() {
      const orderId = Number(id);

      if (!id || !Number.isSafeInteger(orderId) || orderId <= 0) {
        setError('Invalid order ID.');
        setLoading(false);
        return;
      }

      try {
        const response = await getOrderById(orderId);

        if (isActive) {
          setOrder(response.data);
          setError(null);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load this order.'
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      isActive = false;
    };
  }, [id]);

  async function handlePayment() {
    if (!order || paymentInitiating) return;

    setPaymentInitiating(true);
    setPaymentError(null);

    try {
      const response = await initiateKhaltiPayment(order.id);

      // The backend returns either the existing active session
      // or a newly created Khalti payment session.
      window.location.assign(response.data.paymentUrl);
    } catch (err) {
      setPaymentError(
        err instanceof Error
          ? err.message
          : 'Unable to initiate Khalti payment.'
      );
      setPaymentInitiating(false);
    }
  }

  if (loading) {
    return (
      <main>
        <p>Loading order details...</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main>
        <h1>Unable to load order</h1>
        <p role="alert">{error ?? 'Order not found.'}</p>
        <Link to="/orders">Back to My Orders</Link>
      </main>
    );
  }

  const paymentStatus = order.Payment.status;


const canPay =
  user?.role === 'customer' &&
  order.status === 'pending' &&
  paymentStatus !== 'completed';

  const paymentButtonLabel =
    paymentStatus === 'failed'
      ? 'Retry Payment'
      : order.Payment.pidx
        ? 'Resume Khalti Payment'
        : 'Pay with Khalti';

  return (
    <main>
      <h1>Order Details</h1>

      <section>
        <h2>Order #{order.id}</h2>
        <p>
          Order status: <strong>{order.status}</strong>
        </p>
        <p>
          Payment status: <strong>{paymentStatus}</strong>
        </p>
        <p>
          Placed on: {new Date(order.createdAt).toLocaleString()}
        </p>
      </section>

      <section>
        <h2>Items</h2>

        {order.OrderItems.map((item) => (
          <article key={item.id}>
            <h3>{item.bookTitle}</h3>
            <p>Quantity: {item.quantity}</p>
            <p>
              Unit price: Rs. {Number(item.unitPrice).toFixed(2)}
            </p>
            <p>
              Subtotal: Rs.{' '}
              {(Number(item.unitPrice) * item.quantity).toFixed(2)}
            </p>
          </article>
        ))}
      </section>

      <section>
        <h2>Payment Summary</h2>
        <p>Provider: {order.Payment.provider}</p>
        <p>Total: Rs. {Number(order.totalAmount).toFixed(2)}</p>

        {paymentStatus === 'pending' &&
          order.status === 'pending' && (
            <>
              <p>Your payment is awaiting completion.</p>

              {order.Payment.pidx && (
                <p>
                  An existing Khalti payment session is associated
                  with this order. You can resume it below.
                </p>
              )}

              {canPay && (
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={paymentInitiating}
                >
                  {paymentInitiating
                    ? 'Redirecting to Khalti...'
                    : paymentButtonLabel}
                </button>
              )}

              {paymentError && (
                <p role="alert">{paymentError}</p>
              )}
            </>
          )}

        {paymentStatus === 'completed' && (
          <p role="status">
            Payment completed successfully.
          </p>
        )}

        {paymentStatus === 'failed' && (
          <>
            <p role="alert">
              Payment failed or was cancelled. You can retry
              payment if this order is still pending.
            </p>

            {canPay && (
              <button
                type="button"
                onClick={handlePayment}
                disabled={paymentInitiating}
              >
                {paymentInitiating
                  ? 'Redirecting to Khalti...'
                  : paymentButtonLabel}
              </button>
            )}

            {paymentError && (
              <p role="alert">{paymentError}</p>
            )}
          </>
        )}
      </section>

      <p>
        <Link to="/orders">Back to My Orders</Link>
      </p>

      <p>
        <Link to="/books">Continue browsing</Link>
      </p>
    </main>
  );
}

export default OrderConfirmation;
