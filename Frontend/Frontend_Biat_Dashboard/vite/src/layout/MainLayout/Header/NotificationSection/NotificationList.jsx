import PropTypes from 'prop-types';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { IconCircleCheck, IconCircleX, IconClock, IconBell } from '@tabler/icons-react';

const typeConfig = {
  APPROVAL:        { bg: '#dcfce7', color: '#16a34a', Icon: IconCircleCheck },
  AUTO_PUBLISHED:  { bg: '#dcfce7', color: '#16a34a', Icon: IconCircleCheck },
  REJECTION:       { bg: '#fee2e2', color: '#dc2626', Icon: IconCircleX },
  PENDING_APPROVAL:{ bg: '#fffbeb', color: '#d97706', Icon: IconClock },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationList({ notifications, onMarkRead }) {
  if (!notifications || notifications.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <IconBell size={28} color="#94a3b8" />
        <Typography sx={{ mt: 1, fontSize: 13, color: '#64748b' }}>No notifications yet</Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%', maxWidth: { xs: 300, md: 330 }, py: 0 }}>
      {notifications.map(n => {
        const cfg = typeConfig[n.notification_type] || typeConfig.PENDING_APPROVAL;
        const { Icon } = cfg;
        return (
          <Box
            key={n.id}
            onClick={() => !n.is_read && onMarkRead(n.id)}
            sx={{
              px: 2, py: 1.5,
              borderBottom: '1px solid #f1f5f9',
              cursor: n.is_read ? 'default' : 'pointer',
              bgcolor: n.is_read ? 'transparent' : '#fafbff',
              '&:hover': { bgcolor: '#f1f5f9' },
              display: 'flex', alignItems: 'flex-start', gap: 1.5,
            }}
          >
            <Avatar sx={{ width: 34, height: 34, bgcolor: cfg.bg, flexShrink: 0, mt: 0.25 }}>
              <Icon size={17} color={cfg.color} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12.5, color: '#1e3a5f', lineHeight: 1.5, fontWeight: n.is_read ? 400 : 600 }}>
                {n.message}
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.4 }}>
                {timeAgo(n.created_at)}
              </Typography>
            </Box>
            {!n.is_read && (
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#3b82f6', flexShrink: 0, mt: 1 }} />
            )}
          </Box>
        );
      })}
    </List>
  );
}

NotificationList.propTypes = {
  notifications: PropTypes.array,
  onMarkRead: PropTypes.func,
};
