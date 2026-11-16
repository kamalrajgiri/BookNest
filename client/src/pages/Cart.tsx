
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  changeCartItemQuantity,
  clearCustomerCart,
  fetchCart,
  removeItemFromCart,
} from '../features/cart/cartSlice';

import { createOrder } from '../services/orderService';
import { useAppDispatch, useAppSelector } from '../store/hooks';

function Cart() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { cart, status, mutationStatus, error } = useAppSelector(
    (state) => state.cart
  );

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const items = cart?.CartItems ?? [];
  const isMutating = mutationStatus === 'loading';

  useEffect(() => {
    void dispatch(fetchCart());
  }, [dispatch]);

  const total = items.reduce(
    (sum, item) => sum + Number(item.Book.price) * item.quantity,
    0
  );

  function handleQuantityChange(itemId: number, quantity: number) {
    if (quantity < 1) return;

    void dispatch(changeCartItemQuantity({ itemId, quantity }));
  }

  function handleRemove(itemId: number) {
    void dispatch(removeItemFromCart(itemId));
  }

  function handleClear() {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      void dispatch(clearCustomerCart());
    }
  }

  async function handleCheckout() {
    if (items.length === 0 || isCheckingOut || isMutating) return;

    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const response = await createOrder();

      navigate(`/orders/${response.data.id}`, {
        state: { createdOrder: response.data },
      });
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : 'Unable to create your order. Please try again.'
      );
    } finally {
      setIsCheckingOut(false);
    }
  }

  if (status === 'loading') {
    return <main><p>Loading your cart...</p></main>;
  }

  if (status === 'failed' && !cart) {
    return (
      <main>
        <p role="alert">{error ?? 'Unable to load your cart.'}</p>
        <button type="button" onClick={() => void dispatch(fetchCart())}>
          Try again
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Your Cart</h1>

      {error && <p role="alert">{error}</p>}

      {checkoutError && (
        <p role="alert">{checkoutError}</p>
      )}

      {items.length === 0 ? (
        <section>
          <p>Your cart is empty.</p>
          <Link to="/books">Browse books</Link>
        </section>
      ) : (
        <>
          <section>
            {items.map((item) => (
              <article key={item.id}>
                <h2>
                  <Link to={`/books/${item.Book.id}`}>
                    {item.Book.title}
                  </Link>
                </h2>

                <p>Author: {item.Book.author}</p>
                <p>Price: Rs. {Number(item.Book.price).toFixed(2)}</p>

                <div>
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${item.Book.title}`}
                    disabled={
                      isMutating ||
                      isCheckingOut ||
                      item.quantity <= 1
                    }
                    onClick={() =>
                      handleQuantityChange(item.id, item.quantity - 1)
                    }
                  >
                    -
                  </button>

                  <span aria-label="Quantity">{item.quantity}</span>

                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.Book.title}`}
                    disabled={
                      isMutating ||
                      isCheckingOut ||
                      item.quantity >= item.Book.stock
                    }
                    onClick={() =>
                      handleQuantityChange(item.id, item.quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>

                <p>
                  Subtotal: Rs.{' '}
                  {(Number(item.Book.price) * item.quantity).toFixed(2)}
                </p>

                <button
                  type="button"
                  disabled={isMutating || isCheckingOut}
                  onClick={() => handleRemove(item.id)}
                >
                  Remove
                </button>
              </article>
            ))}
          </section>

          <section>
            <h2>Order Summary</h2>
            <p>Total: Rs. {total.toFixed(2)}</p>

            <button
              type="button"
              disabled={isMutating || isCheckingOut}
              onClick={handleClear}
            >
              Clear Cart
            </button>

            <button
              type="button"
              disabled={isMutating || isCheckingOut}
              onClick={() => void handleCheckout()}
            >
              {isCheckingOut ? 'Creating Order...' : 'Place Order'}
            </button>
          </section>
        </>
      )}
    </main>
  );
}

export default Cart;
