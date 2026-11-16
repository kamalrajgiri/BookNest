
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAppSelector } from '../../store/hooks';
import type { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, status } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <p>Checking authentication...</p>;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
