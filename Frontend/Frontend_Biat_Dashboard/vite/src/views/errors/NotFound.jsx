import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import { IconShieldCheck, IconArrowLeft } from '@tabler/icons-react';

const C = { navy: '#1e3a5f', slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc' };

export default function NotFound() {
  const navigate = useNavigate();
  const isAuth = sessionStorage.getItem('biat_auth') === 'true';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: C.bg }}>
      <Paper variant="outlined" sx={{ p: 6, borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', maxWidth: 440 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 4 }}>
          <Box sx={{ width: 36, height: 36, bgcolor: C.navy, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconShieldCheck size={20} color="#fff" />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: C.navy }}>BIAT Dev Portal</Typography>
        </Box>
        <Typography sx={{ fontSize: 80, fontWeight: 900, color: C.navy, lineHeight: 1, mb: 1 }}>404</Typography>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Page not found</Typography>
        <Typography sx={{ fontSize: 13, color: C.slate, mt: 1, mb: 3 }}>
          The page you are looking for does not exist or has been moved.
        </Typography>
        <Button
          onClick={() => navigate(isAuth ? '/dashboard' : '/login')}
          variant="contained"
          startIcon={<IconArrowLeft size={15} />}
          sx={{ bgcolor: C.navy, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, boxShadow: 'none', '&:hover': { bgcolor: '#162d4a' } }}>
          {isAuth ? 'Back to Dashboard' : 'Back to Login'}
        </Button>
      </Paper>
    </Box>
  );
}
