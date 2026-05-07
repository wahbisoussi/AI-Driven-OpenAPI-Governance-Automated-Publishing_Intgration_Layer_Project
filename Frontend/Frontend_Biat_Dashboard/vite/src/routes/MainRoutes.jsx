import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';

// BIAT page routing
const UploadPipeline = Loadable(lazy(() => import('views/upload/UploadPipeline')));
const MyAPIs = Loadable(lazy(() => import('views/my-apis/MyAPIs')));
const Settings = Loadable(lazy(() => import('views/settings/Settings')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: <MainLayout />,
  children: [
    {
      path: '/',
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
