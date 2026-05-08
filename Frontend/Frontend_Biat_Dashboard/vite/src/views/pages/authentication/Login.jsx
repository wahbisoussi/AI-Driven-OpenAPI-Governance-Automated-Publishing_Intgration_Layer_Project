import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Paper, Alert, CircularProgress } from '@mui/material';
import { IconShieldCheck } from '@tabler/icons-react';

// ================================|| BIAT LOGIN ||================================ //

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (lockedUntil && Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Try again in ${secs}s.`);
      return;
    }

    if (!username || !password) { setError('Please enter your credentials.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));

    if (username === 'admin' && password === 'admin') {
      setAttempts(0);
      setLockedUntil(null);
      sessionStorage.setItem('biat_pending_verify', 'true');
      navigate('/verify');
    } else {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setAttempts(0);
        setError('Account temporarily locked after too many failed attempts.');
      } else {
        setError(`Invalid credentials. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} remaining.`);
      }
    }
    setLoading(false);
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', bgcolor: '#f8fafc',
      backgroundImage: 'radial-gradient(ellipse at top left, #e8edf5 0%, #f8fafc 60%)'
    }}>
      {/* Left panel */}
      <Box sx={{
        width: { xs: 0, md: '50%' }, bgcolor: '#1e3a5f', display: { xs: 'none', md: 'flex' },
        flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 6
      }}>
        <Box sx={{ textAlign: 'center', color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 44, height: 44, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconShieldCheck size={26} color="#fff" />
            </Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>BIAT Dev</Typography>
          </Box>
          <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700, mb: 2, lineHeight: 1.3 }}>
            AI-Driven API Governance
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.7 }}>
            Automated OpenAPI validation, AI-powered analysis, and seamless WSO2 publishing for BIAT&apos;s API ecosystem.
          </Typography>
          <Box sx={{ mt: 5, display: 'flex', gap: 3, justifyContent: 'center' }}>
            {[{ num: '50+', label: 'APIs Managed' }, { num: '80%', label: 'Min Score' }, { num: '0', label: 'Manual Steps' }].map(s => (
              <Box key={s.label} sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 800, fontSize: 28, color: '#fff' }}>{s.num}</Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right panel */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper sx={{ width: '100%', maxWidth: 420, p: 4, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4 }}>
            <Box sx={{ width: 36, height: 36, bgcolor: '#1e3a5f', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconShieldCheck size={20} color="#fff" />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e3a5f' }}>BIAT Dev Portal</Typography>
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>Welcome back</Typography>
          <Typography sx={{ color: '#64748b', fontSize: 14, mb: 3 }}>Sign in to the API Governance Platform</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleLogin}>
            <TextField
              label="Username" fullWidth value={username}
              onChange={e => setUsername(e.target.value)}
              sx={{ mb: 2 }} size="medium" />
            <TextField
              label="Password" type="password" fullWidth value={password}
              onChange={e => setPassword(e.target.value)}
              sx={{ mb: 3 }} size="medium" />
            <Button
              type="submit" fullWidth variant="contained" disabled={loading}
              sx={{ bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#162d4a' }, py: 1.5, borderRadius: 2, fontWeight: 600, fontSize: 15 }}>
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Sign In'}
            </Button>
          </form>

          <Typography sx={{ textAlign: 'center', mt: 3, fontSize: 12, color: '#94a3b8' }}>
            BIAT Innovation & Technology — Integration Layer
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
