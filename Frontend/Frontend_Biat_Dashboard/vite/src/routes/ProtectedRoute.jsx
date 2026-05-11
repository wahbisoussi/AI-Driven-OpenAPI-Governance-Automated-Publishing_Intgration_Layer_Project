import { Navigate, useLocation } from 'react-router-dom';

function isTokenValid() {
  const token = sessionStorage.getItem('biat_token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isTokenValid()) {
    sessionStorage.clear();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
