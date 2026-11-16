
import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from 'react-router-dom';
import './App.css'

import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuth } from './features/auth/authSlice';

import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import Books from './pages/Books';
import BookDetails from './pages/BookDetails';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import OrderConfirmation from './pages/OrderConfirmation';
import Orders from './pages/Orders';
import PaymentReturn from './pages/PaymentReturn';
import AdminDashboard from './pages/AdminDashboard';


function HomePage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <section>
      <h1>Discover Your Next Favourite Book</h1>

      <p>
        Explore inspiring stories, discover new authors, and find
        books worth keeping at BookNest.
      </p>

      <p>
        <Link to="/books">Explore Our Collection</Link>
      </p>

      {!user && (
        <p>
          New to BookNest?{' '}
          <Link to="/register">Create an Account</Link>
        </p>
      )}

      {user && (
        <p>Welcome back, {user.name}. Happy reading!</p>
      )}
    </section>
  );
}



function NotificationsPage() {
  return <h1>My Notifications</h1>;
}



function AppContent() {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  if (authStatus === 'idle' || authStatus === 'loading') {
    return <p>Loading BookNest...</p>;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/books" element={<Books />} />
        <Route path="/books/:id" element={<BookDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderConfirmation />} />
          <Route path="/payment/return" element={<PaymentReturn />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
