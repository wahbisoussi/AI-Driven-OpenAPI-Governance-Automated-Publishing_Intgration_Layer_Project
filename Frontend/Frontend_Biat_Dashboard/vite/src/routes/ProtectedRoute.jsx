import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const isAuth = localStorage.getItem('biat_auth') === 'true';
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
