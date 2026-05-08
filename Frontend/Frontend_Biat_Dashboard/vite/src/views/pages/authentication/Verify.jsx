import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Alert, CircularProgress, Button } from '@mui/material';
import { IconShieldCheck, IconLock } from '@tabler/icons-react';

// ================================|| BIAT 2FA VERIFY ||================================ //

const MAX_PIN_ATTEMPTS = 3;

export default function Verify() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (!sessionStorage.getItem('biat_pending_verify')) {
      navigate('/login');
    }
    refs[0].current?.focus();
  }, []);

  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    setError('');
    if (val && idx < 3) refs[idx + 1].current?.focus();
    if (next.every(d => d !== '') && idx === 3) {
      verify(next.join(''));
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  const verify = async (pin) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    if (pin === '6767') {
      sessionStorage.removeItem('biat_pending_verify');
      sessionStorage.setItem('biat_auth', 'true');
      navigate('/dashboard');
    } else {
      const next = pinAttempts + 1;
      setPinAttempts(next);
      if (next >= MAX_PIN_ATTEMPTS) {
        sessionStorage.removeItem('biat_pending_verify');
        navigate('/login');
      } else {
        const remaining = MAX_PIN_ATTEMPTS - next;
        setError(`Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
        setDigits(['', '', '', '']);
        setShake(true);
        setTimeout(() => { setShake(false); refs[0].current?.focus(); }, 600);
      }
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const pin = digits.join('');
    if (pin.length < 4) { setError('Enter all 4 digits.'); return; }
    verify(pin);
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', bgcolor: '#f8fafc',
      backgroundImage: 'radial-gradient(ellipse at top left, #e8edf5 0%, #f8fafc 60%)'
    }}>
      {/* Left panel */}
      <Box sx={{
        width: { xs: 0, md: '50%' }, bgcolor: '#1e3a5f',
        display: { xs: 'none', md: 'flex' },
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
            Two-Factor Authentication
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.7 }}>
            An extra layer of security to protect access to the API Governance Platform.
          </Typography>
          <Box sx={{ mt: 5, p: 3, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.12)' }}>
            <IconLock size={32} color="rgba(255,255,255,0.6)" />
            <Typography sx={{ mt: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              Enter the 4-digit verification code sent to your device to complete sign-in.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right panel */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper sx={{ width: '100%', maxWidth: 420, p: 4, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4 }}>
            <Box sx={{ width: 36, height: 36, bgcolor: '#1e3a5f', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconLock size={20} color="#fff" />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e3a5f' }}>BIAT Dev Portal</Typography>
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>Verification</Typography>
          <Typography sx={{ color: '#64748b', fontSize: 14, mb: 4 }}>
            Enter your 4-digit security PIN to access the platform.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'flex', gap: 2, justifyContent: 'center', mb: 4,
                animation: shake ? 'shake 0.5s ease' : 'none',
                '@keyframes shake': {
                  '0%, 100%': { transform: 'translateX(0)' },
                  '20%, 60%': { transform: 'translateX(-8px)' },
                  '40%, 80%': { transform: 'translateX(8px)' }
                }
              }}
            >
              {digits.map((d, i) => (
                <Box
                  key={i}
                  component="input"
                  ref={refs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  disabled={loading}
                  sx={{
                    width: 64, height: 72, textAlign: 'center', fontSize: 28, fontWeight: 700,
                    border: `2px solid ${d ? '#1e3a5f' : '#e2e8f0'}`,
                    borderRadius: 2, outline: 'none', bgcolor: d ? '#f0f4ff' : '#fff',
                    color: '#1e293b', transition: 'all 0.2s', cursor: 'text',
                    '&:focus': { borderColor: '#1e3a5f', boxShadow: '0 0 0 3px rgba(30,58,95,0.12)', bgcolor: '#f0f4ff' },
                    '&:disabled': { opacity: 0.6 }
                  }}
                />
              ))}
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || digits.some(d => d === '')}
              sx={{ bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#162d4a' }, py: 1.5, borderRadius: 2, fontWeight: 600, fontSize: 15, mb: 2 }}>
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Verify & Continue'}
            </Button>

            <Button
              fullWidth variant="text"
              onClick={() => navigate('/login')}
              sx={{ color: '#64748b', fontSize: 13 }}>
              ← Back to Sign In
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
