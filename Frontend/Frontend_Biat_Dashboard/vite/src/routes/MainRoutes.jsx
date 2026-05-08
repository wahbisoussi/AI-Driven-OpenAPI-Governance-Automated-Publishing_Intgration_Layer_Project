import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import ProtectedRoute from './ProtectedRoute';

// BIAT page routing
const UploadPipeline = Loadable(lazy(() => import('views/upload/UploadPipeline')));
const MyAPIs = Loadable(lazy(() => import('views/my-apis/MyAPIs')));
const Settings = Loadable(lazy(() => import('views/settings/Settings')));

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
      path: '/settings',
      element: <Settings />
    }
  ]
};

export default MainRoutes;
