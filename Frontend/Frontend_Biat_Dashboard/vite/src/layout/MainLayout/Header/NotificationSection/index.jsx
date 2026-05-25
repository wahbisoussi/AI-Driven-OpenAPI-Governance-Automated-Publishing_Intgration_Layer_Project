import { useEffect, useRef, useState } from 'react';

import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import MainCard from 'ui-component/cards/MainCard';
import Transitions from 'ui-component/extended/Transitions';
import NotificationList from './NotificationList';
import api from 'services/api';

import { IconBell } from '@tabler/icons-react';

const POLL_MS = 30_000;

export default function NotificationSection() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  const anchorRef = useRef(null);
  const intervalRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/specs/notifications/list');
      setNotifications(res.data || []);
    } catch {
      // silent fail — notifications are non-critical
    }
  };

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_MS);
    window.addEventListener('notifications:refresh', fetchNotifications);
    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener('notifications:refresh', fetchNotifications);
    };
  }, []);

  const handleToggle = () => setOpen(prev => !prev);

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) return;
    setOpen(false);
  };

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/specs/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => api.patch(`/specs/notifications/${n.id}/read`).catch(() => {})));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current === true && open === false) anchorRef.current?.focus();
    prevOpen.current = open;
  }, [open]);

  return (
    <>
      <Box sx={{ ml: 2 }}>
        <Badge badgeContent={unreadCount > 0 ? unreadCount : null} color="error" max={9}
          sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}>
          <Avatar
            variant="rounded"
            sx={{
              ...theme.typography.commonAvatar,
              ...theme.typography.mediumAvatar,
              transition: 'all .2s ease-in-out',
              color: theme.vars.palette.warning.dark,
              background: theme.vars.palette.warning.light,
              '&:hover, &[aria-controls="menu-list-grow"]': {
                color: theme.vars.palette.warning.light,
                background: theme.vars.palette.warning.dark,
              },
            }}
            ref={anchorRef}
            aria-controls={open ? 'menu-list-grow' : undefined}
            aria-haspopup="true"
            onClick={handleToggle}
          >
            <IconBell stroke={1.5} size="20px" />
          </Avatar>
        </Badge>
      </Box>

      <Popper
        placement={downMD ? 'bottom' : 'bottom-end'}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        modifiers={[{ name: 'offset', options: { offset: [downMD ? 5 : 0, 20] } }]}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Transitions position={downMD ? 'top' : 'top-right'} in={open} {...TransitionProps}>
              <Paper>
                <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]} sx={{ maxWidth: 340 }}>
                  <Stack sx={{ gap: 0 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 2, pb: 1.5, px: 2 }}>
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Notifications</Typography>
                        {unreadCount > 0 && (
                          <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 700 }}>
                            {unreadCount} new
                          </Box>
                        )}
                      </Stack>
                      {unreadCount > 0 && (
                        <Typography
                          onClick={handleMarkAllRead}
                          sx={{ fontSize: 12, color: '#1e3a5f', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                        >
                          Mark all read
                        </Typography>
                      )}
                    </Stack>
                    <Divider />
                    <Box sx={{ maxHeight: 360, overflowY: 'auto', overflowX: 'hidden', '&::-webkit-scrollbar': { width: 4 } }}>
                      <NotificationList notifications={notifications} onMarkRead={handleMarkRead} />
                    </Box>
                  </Stack>
                  <CardActions sx={{ p: 1.25, justifyContent: 'center' }}>
                    <Button size="small" disableElevation onClick={fetchNotifications} sx={{ textTransform: 'none', fontSize: 12 }}>
                      Refresh
                    </Button>
                  </CardActions>
                </MainCard>
              </Paper>
            </Transitions>
          </ClickAwayListener>
        )}
      </Popper>
    </>
  );
}
