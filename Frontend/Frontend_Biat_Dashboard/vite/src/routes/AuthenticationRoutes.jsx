import { lazy } from 'react';

// project imports
import Loadable from 'ui-component/Loadable';
import MinimalLayout from 'layout/MinimalLayout';

// maintenance routing
const LoginPage = Loadable(lazy(() => import('views/pages/authentication/Login')));
const VerifyPage = Loadable(lazy(() => import('views/pages/authentication/Verify')));
const NotFound = Loadable(lazy(() => import('views/errors/NotFound')));
const ServerError = Loadable(lazy(() => import('views/errors/ServerError')));

// ==============================|| AUTHENTICATION ROUTING ||============================== //

const AuthenticationRoutes = {
  path: '/',
  element: <MinimalLayout />,
  children: [
    {
      path: '/login',
      element: <LoginPage />
    },
    {
      path: '/verify',
      element: <VerifyPage />
    },
    {
      path: '/404',
      element: <NotFound />
    },
    {
      path: '/500',
      element: <ServerError />
    }
  ]
};

export default AuthenticationRoutes;
