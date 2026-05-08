// assets
import { IconDashboard, IconApi, IconSettings, IconShieldCheck, IconChartBar } from '@tabler/icons-react';

// constant
const icons = { IconDashboard, IconApi, IconSettings, IconShieldCheck, IconChartBar };

// ==============================|| BIAT MENU ITEMS ||============================== //

const dashboard = {
  id: 'biat-nav',
  title: 'Main',
  type: 'group',
  children: [
    {
      id: 'upload',
      title: 'Dashboard',
      type: 'item',
      url: '/dashboard',
      icon: icons.IconDashboard,
      breadcrumbs: false
    },
    {
      id: 'my-apis',
      title: 'My APIs',
      type: 'item',
      url: '/my-apis',
      icon: icons.IconApi,
      breadcrumbs: false
    },
    {
      id: 'analytics',
      title: 'Analytics',
      type: 'item',
      url: '/analytics',
      icon: icons.IconChartBar,
      breadcrumbs: false
    }
  ]
};

const system = {
  id: 'biat-system',
  title: 'System',
  type: 'group',
  children: [
    {
      id: 'settings',
      title: 'Settings',
      type: 'item',
      url: '/settings',
      icon: icons.IconSettings,
      breadcrumbs: false
    }
  ]
};

export { system };
export default dashboard;
