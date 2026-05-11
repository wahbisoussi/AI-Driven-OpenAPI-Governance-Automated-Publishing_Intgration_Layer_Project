import { useState } from 'react';
import { Box, Typography, Paper, Divider, Grid, TextField, Button, Alert, Avatar, Chip } from '@mui/material';
import { IconSettings, IconUser, IconLock, IconCheck } from '@tabler/icons-react';
import api from 'services/api';

const C = {
  navy: '#1e3a5f', navyLt: '#eef2f8',
  slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc',
};

export default function Settings() {
  const user = (() => {
    try { return JSON.parse(sessionStorage.getItem('biat_user') || '{}'); }
    catch { return {}; }
  })();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwResult, setPwResult] = useState(null);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwResult(null);
    if (newPw !== confirmPw) { setPwResult({ type: 'error', msg: 'New passwords do not match.' }); return; }
    if (newPw.length < 6) { setPwResult({ type: 'error', msg: 'Password must be at least 6 characters.' }); return; }
    setPwLoading(true);
    try {
      await api.put('/auth/password', { current_password: currentPw, new_password: newPw });
      setPwResult({ type: 'success', msg: 'Password updated successfully.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwResult({ type: 'error', msg: err.response?.data?.detail || 'Failed to update password.' });
    } finally {
      setPwLoading(false);
    }
  };

  const avatarLetter = (user.username || 'A').charAt(0).toUpperCase();

  return (
    <Box>
      <Typography variant="h3" sx={{ color: C.navy, fontWeight: 700, mb: 0.5 }}>Settings</Typography>
      <Typography sx={{ color: C.slate, mb: 3 }}>Account preferences and platform configuration.</Typography>

      {/* Account Profile */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: C.navyLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconUser size={16} color={C.navy} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Account Profile</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: C.navy, fontSize: 22, fontWeight: 700 }}>{avatarLetter}</Avatar>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: C.navy }}>{user.username || '—'}</Typography>
            <Typography sx={{ fontSize: 13, color: C.slate }}>{user.email || '—'}</Typography>
          </Box>
          <Chip label={user.role || 'ADMIN'} size="small" sx={{ bgcolor: C.navyLt, color: C.navy, fontWeight: 700, fontSize: 11, ml: 'auto' }} />
        </Box>
        <Divider sx={{ mb: 2.5 }} />
        <Grid container spacing={3}>
          {[
            { label: 'Username', value: user.username },
            { label: 'Email', value: user.email },
            { label: 'Role', value: user.role },
            { label: 'Department', value: user.department },
          ].map(item => (
            <Grid item xs={12} sm={6} md={3} key={item.label}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.navy, fontFamily: 'monospace' }}>{item.value || '—'}</Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Security — Password Change */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: C.navyLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconLock size={16} color={C.navy} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Security</Typography>
        </Box>

        {pwResult && <Alert severity={pwResult.type} sx={{ mb: 2, borderRadius: 1.5 }}>{pwResult.msg}</Alert>}

        <form onSubmit={handlePasswordChange}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField label="Current Password" type="password" fullWidth size="small"
                value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="New Password" type="password" fullWidth size="small"
                value={newPw} onChange={e => setNewPw(e.target.value)} required />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Confirm New Password" type="password" fullWidth size="small"
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" disabled={pwLoading} startIcon={<IconCheck size={16} />}
                sx={{ bgcolor: C.navy, '&:hover': { bgcolor: '#162d4a' }, borderRadius: 1.5, fontWeight: 600, textTransform: 'none' }}>
                {pwLoading ? 'Updating…' : 'Update Password'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Platform Configuration */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: C.navyLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconSettings size={16} color={C.navy} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Platform Configuration</Typography>
        </Box>
        {[
          { label: 'API Backend URL',        value: 'http://localhost:8000' },
          { label: 'WSO2 Publisher URL',     value: 'https://localhost:9443/publisher' },
          { label: 'AI Engine',              value: 'Ollama + Qwen 2.5 (1.5b)' },
          { label: 'Vector DB',              value: 'PostgreSQL + PGVector' },
          { label: 'Governance Threshold',   value: '80% structural score, 0 errors' },
          { label: 'Auth Method',            value: 'OAuth2 Password Flow + JWT (8h)' },
        ].map(item => (
          <Box key={item.label} sx={{ display: 'flex', py: 1.5, borderBottom: `1px solid ${C.bg}` }}>
            <Typography sx={{ fontSize: 13, color: C.slate, width: 220 }}>{item.label}</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: C.navy }}>{item.value}</Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
