import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import Chip from '@mui/material/Chip';

// project imports
import LogoSection from '../LogoSection';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

// assets
import { IconMenu2, IconSettings, IconLogout, IconUser } from '@tabler/icons-react';

// ==============================|| BIAT HEADER ||============================== //

export default function Header() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    sessionStorage.removeItem('biat_auth');
    handleClose();
    navigate('/login');
  };

  const handleSettings = () => {
    handleClose();
    navigate('/settings');
  };

  return (
    <>
      {/* Logo & drawer toggle */}
      <Box sx={{ width: downMD ? 'auto' : 228, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box component="span" sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1 }}>
          <LogoSection />
        </Box>
        <Avatar
          variant="rounded"
          sx={{
            width: 34, height: 34, cursor: 'pointer',
            bgcolor: '#f1f5f9', color: '#475569',
            '&:hover': { bgcolor: '#e2e8f0' }
          }}
          onClick={() => handlerDrawerOpen(!drawerOpen)}
        >
          <IconMenu2 stroke={1.5} size="18px" />
        </Avatar>
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      {/* User section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Chip
          label="BIAT Governance"
          size="small"
          sx={{ bgcolor: '#e8edf5', color: '#1e3a5f', fontWeight: 600, fontSize: 11, display: { xs: 'none', sm: 'flex' } }}
        />

        <Box
          onClick={handleOpen}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
            px: 1.5, py: 0.75, borderRadius: 2,
            border: '1px solid #e2e8f0',
            bgcolor: open ? '#f1f5f9' : 'transparent',
            '&:hover': { bgcolor: '#f1f5f9' },
            transition: 'all 0.2s'
          }}
        >
          <Avatar sx={{ width: 30, height: 30, bgcolor: '#1e3a5f', fontSize: 12, fontWeight: 700 }}>A</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>Admin</Typography>
            <Typography sx={{ fontSize: 11, color: '#64748b', lineHeight: 1 }}>Administrator</Typography>
          </Box>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{
            paper: {
              elevation: 3,
              sx: { mt: 1, minWidth: 200, borderRadius: 2, border: '1px solid #f1f5f9' }
            }
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Admin User</Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b' }}>admin@biat.com.tn</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleSettings} sx={{ py: 1.2, gap: 1 }}>
            <ListItemIcon><IconSettings size={16} color="#475569" /></ListItemIcon>
            <Typography sx={{ fontSize: 13 }}>Settings</Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ py: 1.2, gap: 1, color: '#ef4444' }}>
            <ListItemIcon><IconLogout size={16} color="#ef4444" /></ListItemIcon>
            <Typography sx={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Logout</Typography>
          </MenuItem>
        </Menu>
      </Box>
    </>
  );
}
