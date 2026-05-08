import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import { IconShieldCheck, IconRefresh, IconArrowLeft } from '@tabler/icons-react';

const C = { navy: '#1e3a5f', slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc', red: '#dc2626', redLt: '#fee2e2' };

export default function ServerError() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: C.bg }}>
      <Paper variant="outlined" sx={{ p: 6, borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', maxWidth: 440 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 4 }}>
          <Box sx={{ width: 36, height: 36, bgcolor: C.navy, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconShieldCheck size={20} color="#fff" />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: C.navy }}>BIAT Dev Portal</Typography>
        </Box>
        <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: C.redLt, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
          <Typography sx={{ fontSize: 32, fontWeight: 900, color: C.red, lineHeight: 1 }}>!</Typography>
        </Box>
        <Typography sx={{ fontSize: 56, fontWeight: 900, color: C.red, lineHeight: 1 }}>500</Typography>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1e293b', mt: 1 }}>Internal Server Error</Typography>
        <Typography sx={{ fontSize: 13, color: C.slate, mt: 1, mb: 3 }}>
          Something went wrong on our end. Please try again or contact the platform administrator.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
          <Button
            onClick={() => window.history.back()}
            variant="outlined"
            startIcon={<IconArrowLeft size={15} />}
            sx={{ borderColor: C.border, color: C.slate, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: C.navy, color: C.navy } }}>
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="contained"
            startIcon={<IconRefresh size={15} />}
            sx={{ bgcolor: C.navy, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, boxShadow: 'none', '&:hover': { bgcolor: '#162d4a' } }}>
            Dashboard
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
