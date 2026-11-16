import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { verifyKhaltiPayment } from '../services/orderService';
import type { KhaltiVerificationResponse } from '../types/order';

// Prevent duplicate verification requests during React Strict Mode effects.
const verificationRequests = new Map<
  number,
  Promise<KhaltiVerificationResponse>
>();

function verifyOrderPayment(
  orderId: number
): Promise<KhaltiVerificationResponse> {
  const existingRequest = verificationRequests.get(orderId);

  if (existingRequest) {
    return existingRequest;
  }

  const request = verifyKhaltiPayment(orderId);

  verificationRequests.set(orderId, request);

  const clearRequest = () => {
    if (verificationRequests.get(orderId) === request) {
      verificationRequests.delete(orderId);
    }
  };

  void request.then(clearRequest, clearRequest);

  return request;
}

function PaymentReturn() {
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    KhaltiVerificationResponse['data'] | null
  >(null);

  useEffect(() => {
    let isActive = true;

    async function verifyPayment() {
      const rawOrderId = searchParams.get('purchase_order_id');
      const orderId = Number(rawOrderId);

      if (
        !rawOrderId ||
        !/^[1-9]\d*$/.test(rawOrderId) ||
        !Number.isSafeInteger(orderId)
      ) {
        setError('Invalid or missing order ID in payment return URL.');
        setLoading(false);
        return;
      }

      try {
        const response = await verifyOrderPayment(orderId);

        if (isActive) {
          setResult(response.data);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to verify your payment.'
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void verifyPayment();

    return () => {
      isActive = false;
    };
  }, [searchParams]);

  if (loading) {
    return (
      <main>
        <h1>Verifying Payment</h1>
        <p>Please wait while we confirm your payment with Khalti.</p>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main>
        <h1>Payment Verification</h1>
        <p role="alert">
          {error ?? 'Unable to verify your payment.'}
        </p>
        <p>
          If money was deducted, please contact support with your
          order details before attempting another payment.
        </p>
        <Link to="/orders">Go to My Orders</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Payment Result</h1>

      <p>Order: #{result.orderId}</p>
      <p>
        Payment status: <strong>{result.paymentStatus}</strong>
      </p>

      {result.paymentStatus === 'completed' && (
        <section>
          <h2>Payment Successful</h2>
          <p>Your payment has been verified by Khalti.</p>
          {result.orderStatus && (
            <p>Order status: {result.orderStatus}</p>
          )}
        </section>
      )}

      {result.paymentStatus === 'failed' && (
        <section>
          <h2>Payment Failed or Cancelled</h2>
          <p>
            Khalti did not confirm a successful payment.
          </p>
        </section>
      )}

      {result.paymentStatus === 'pending' && (
        <section>
          <h2>Payment Not Yet Confirmed</h2>
          <p>
            Khalti has not confirmed this payment. Please do not
            assume the order is paid.
          </p>
        </section>
      )}

      <p>
        <Link to={`/orders/${result.orderId}`}>
          View Order Details
        </Link>
      </p>

      <p>
        <Link to="/orders">Back to My Orders</Link>
      </p>
    </main>
  );
}

export default PaymentReturn;