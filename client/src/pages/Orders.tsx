
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getOrders } from '../services/orderService';
import type { Order } from '../types/order';

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadOrders() {
      try {
        const response = await getOrders();

        if (isActive) {
          setOrders(response.data);
          setError(null);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load your orders.'
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isActive = false;
    };
  }, []);

  if (loading) {
    return (
      <main>
        <p>Loading your orders...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <h1>My Orders</h1>
        <p role="alert">{error}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>My Orders</h1>

      {orders.length === 0 ? (
        <section>
          <p>You haven't placed any orders yet.</p>
          <Link to="/books">Browse books</Link>
        </section>
      ) : (
        <section>
          {orders.map((order) => (
            <article key={order.id}>
              <h2>Order #{order.id}</h2>

              <p>
                Date: {new Date(order.createdAt).toLocaleString()}
              </p>

              <p>
                Order status: <strong>{order.status}</strong>
              </p>

              <p>
                Payment status: <strong>{order.Payment.status}</strong>
              </p>

              <h3>Items</h3>

              {order.OrderItems.map((item) => (
                <div key={item.id}>
                  <p>{item.bookTitle}</p>
                  <p>Quantity: {item.quantity}</p>
                  <p>
                    Unit price: Rs.{' '}
                    {Number(item.unitPrice).toFixed(2)}
                  </p>
                </div>
              ))}

              <p>
                Total: Rs. {Number(order.totalAmount).toFixed(2)}
              </p>

              <Link to={`/orders/${order.id}`}>
                View Order Details
              </Link>
            </article>
          ))}
        </section>
      )}

      <p>
        <Link to="/books">Continue Shopping</Link>
      </p>
    </main>
  );
}

export default Orders;
