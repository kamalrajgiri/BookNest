
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  loginSchema,
  type LoginFormValues,
} from '../features/auth/authSchemas';

import {
  login as loginUser,
  clearAuthError,
} from '../features/auth/authSlice';

import { addItemToCart } from '../features/cart/cartSlice';
import { addItemToWishlist } from '../features/wishlist/wishlistSlice';

import {
  useAppDispatch,
  useAppSelector,
} from '../store/hooks';

interface LoginLocationState {
  registered?: boolean;
  from?: {
    pathname?: string;
  };
  pendingAction?: 'cart' | 'wishlist';
  bookId?: number;
}

function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const error = useAppSelector((state) => state.auth.error);

  const [actionError, setActionError] = useState<string | null>(null);

  const state = location.state as LoginLocationState | null;

  const registered = state?.registered;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      setActionError(null);

      await dispatch(loginUser(values)).unwrap();

      const bookId = state?.bookId;

      const isValidBookId =
        typeof bookId === 'number' &&
        Number.isSafeInteger(bookId) &&
        bookId > 0;

      if (isValidBookId && state?.pendingAction === 'cart') {
        try {
          await dispatch(
            addItemToCart({
              bookId,
              quantity: 1,
            })
          ).unwrap();

          navigate('/cart', { replace: true });
          return;
        } catch (err) {
          setActionError(
            err instanceof Error
              ? err.message
              : 'Unable to add book to cart.'
          );
          return;
        }
      }

      if (isValidBookId && state?.pendingAction === 'wishlist') {
        try {
          await dispatch(
            addItemToWishlist(bookId)
          ).unwrap();

          navigate('/wishlist', { replace: true });
          return;
        } catch (err) {
          setActionError(
            err instanceof Error
              ? err.message
              : 'Unable to add book to wishlist.'
          );
          return;
        }
      }

      const destination = state?.from?.pathname ?? '/';

      navigate(destination, { replace: true });
    } catch {
      // Redux stores the login error.
    }
  }

  return (
    <main>
      <h1>Login to BookNest</h1>

      {registered && (
        <p role="status">
          Registration successful. Please log in.
        </p>
      )}

      {actionError && (
        <div role="alert">
          <p>{actionError}</p>

          <p>
            You are logged in. You can try adding the book again
            from its details page or visit your{' '}
            <Link to="/cart">cart</Link>.
          </p>

          <p>
            <Link to="/books">Browse books</Link>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email', {
              onChange: () => dispatch(clearAuthError()),
            })}
          />

          {errors.email && (
            <p role="alert">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password', {
              onChange: () => dispatch(clearAuthError()),
            })}
          />

          {errors.password && (
            <p role="alert">{errors.password.message}</p>
          )}
        </div>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </main>
  );
}

export default Login;
