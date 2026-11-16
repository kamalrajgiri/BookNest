import { Link, NavLink, useNavigate } from 'react-router-dom';

import { logout as logoutUser } from '../../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

function Navbar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { user } = useAppSelector((state) => state.auth);

  async function handleLogout() {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch {
      // Local authentication state is cleared even if the API fails.
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return (
    <header>
      <nav aria-label="Main navigation">
        <Link to="/">
          <strong>BookNest</strong>
        </Link>

        <div>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/books">Books</NavLink>
        </div>

        <div>
          {!user ? (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          ) : (
            <>
              <span>Hello, {user.name}</span>

              {user.role === 'customer' && (
                <>
                  <NavLink to="/cart">Cart</NavLink>
                  <NavLink to="/wishlist">Wishlist</NavLink>
                  <NavLink to="/orders">My Orders</NavLink>
                  <NavLink to="/notifications">Notifications</NavLink>
                </>
              )}

              {user.role === 'admin' && (
                <NavLink to="/admin">Admin Dashboard</NavLink>
              )}

              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;