import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { FullPageSpinner } from '../Spinner.jsx';

// Renders child routes only for a logged-in user; otherwise sends them to /login
// and remembers where they were going.
export default function ProtectedRoute() {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
