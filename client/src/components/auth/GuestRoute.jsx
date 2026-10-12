import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { FullPageSpinner } from '../Spinner.jsx';

// Login/register pages: a logged-in user is sent on to the app (or back to the page
// they originally asked for). This is also what redirects right after logging in.
export default function GuestRoute() {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return <FullPageSpinner />;
  if (user) return <Navigate to={location.state?.from?.pathname ?? '/chat'} replace />;
  return <Outlet />;
}
