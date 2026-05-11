import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import ProtectedRoute from './ProtectedRoute';

// BIAT page routing
const UploadPipeline = Loadable(lazy(() => import('views/upload/UploadPipeline')));
const MyAPIs = Loadable(lazy(() => import('views/my-apis/MyAPIs')));
const ApiDetail = Loadable(lazy(() => import('views/my-apis/ApiDetail')));
const Analytics = Loadable(lazy(() => import('views/analytics/Analytics')));
const Settings = Loadable(lazy(() => import('views/settings/Settings')));
const NotFound = Loadable(lazy(() => import('views/errors/NotFound')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
  children: [
    {
      index: true,
      element: <Navigate to="/dashboard" replace />
    },
    {
      path: '/dashboard',
      element: <UploadPipeline />
    },
    {
      path: '/my-apis',
      element: <MyAPIs />
    },
    {
      path: '/my-apis/:id',
      element: <ApiDetail />
    },
    {
      path: '/analytics',
      element: <Analytics />
    },
    {
      path: '/settings',
      element: <Settings />
    },
    {
      path: '*',
      element: <NotFound />
    }
  ]
};

export default MainRoutes;
