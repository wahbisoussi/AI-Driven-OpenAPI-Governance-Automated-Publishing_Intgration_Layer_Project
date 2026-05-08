import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import useMediaQuery from '@mui/material/useMediaQuery';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { IconLogout } from '@tabler/icons-react';

// project imports
import MenuList from '../MenuList';
import LogoSection from '../LogoSection';
import MiniDrawerStyled from './MiniDrawerStyled';

import useConfig from 'hooks/useConfig';
import { drawerWidth } from 'store/constant';
import SimpleBar from 'ui-component/third-party/SimpleBar';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

// ==============================|| SIDEBAR DRAWER ||============================== //

function Sidebar() {
  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('biat_auth');
    navigate('/login');
  };

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const {
    state: { miniDrawer }
  } = useConfig();

  const logo = useMemo(
    () => (
      <Box sx={{ display: 'flex', p: 2 }}>
        <LogoSection />
      </Box>
    ),
    []
  );

  const logoutBtn = drawerOpen ? (
    <Box sx={{ px: 2, pb: 2, mt: 'auto' }}>
      <Divider sx={{ mb: 2 }} />
      <Box
        onClick={handleLogout}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2,
          borderRadius: 2, cursor: 'pointer', color: '#ef4444',
          '&:hover': { bgcolor: '#fef2f2' }, transition: 'all 0.2s'
        }}
      >
        <IconLogout size={18} color="#ef4444" />
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Logout</Typography>
      </Box>
    </Box>
  ) : null;

  const drawer = useMemo(() => {
    let drawerSX = { paddingLeft: '0px', paddingRight: '0px', marginTop: '20px' };
    if (drawerOpen) drawerSX = { paddingLeft: '16px', paddingRight: '16px', marginTop: '0px' };

    return (
      <>
        {downMD ? (
          <Box sx={{ ...drawerSX, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <MenuList />
            {logoutBtn}
          </Box>
        ) : (
          <SimpleBar sx={{ height: 'calc(100vh - 90px)', ...drawerSX }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 90px)' }}>
              <MenuList />
              {logoutBtn}
            </Box>
          </SimpleBar>
        )}
      </>
    );
  }, [downMD, drawerOpen, logoutBtn]);

  return (
    <Box component="nav" sx={{ flexShrink: { md: 0 }, width: { xs: 'auto', md: drawerWidth } }} aria-label="mailbox folders">
      {downMD || (miniDrawer && drawerOpen) ? (
        <Drawer
          variant={downMD ? 'temporary' : 'persistent'}
          anchor="left"
          open={drawerOpen}
          onClose={() => handlerDrawerOpen(!drawerOpen)}
          slotProps={{
            paper: {
              sx: {
                mt: downMD ? 0 : 11,
                zIndex: 1099,
                width: drawerWidth,
                bgcolor: 'background.default',
                color: 'text.primary',
                borderRight: 'none'
              }
            }
          }}
          ModalProps={{ keepMounted: true }}
          color="inherit"
        >
          {downMD && logo}
          {drawer}
        </Drawer>
      ) : (
        <MiniDrawerStyled variant="permanent" open={drawerOpen}>
          {logo}
          {drawer}
        </MiniDrawerStyled>
      )}
    </Box>
  );
}

export default memo(Sidebar);
