import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Alert, Button, LinearProgress, Skeleton } from '@mui/material';
import { IconChartBar, IconRefresh, IconUpload, IconCircleCheck, IconCircleX, IconClock, IconApi } from '@tabler/icons-react';
import api from 'services/api';

const C = {
  navy: '#1e3a5f', navyLt: '#eef2f8', navyDk: '#162d4a',
  green: '#16a34a', greenLt: '#dcfce7',
  red: '#dc2626', redLt: '#fee2e2',
  amber: '#d97706', amberLt: '#fffbeb',
  slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc',
};

function scoreColor(score) {
  if (score >= 80) return C.green;
  if (score >= 60) return C.amber;
  return C.red;
}

function ScoreGauge({ score }) {
  const color = scoreColor(score);
  return (
    <Box sx={{ textAlign: 'center', py: 1 }}>
      <Typography sx={{ fontSize: 64, fontWeight: 900, color, lineHeight: 1 }}>
        {score.toFixed(1)}
      </Typography>
      <Typography sx={{ fontSize: 12, color: C.slate, mt: 0.5 }}>/100 average health score</Typography>
      <Box sx={{ mt: 2, mx: 2 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(score, 100)}
          sx={{ height: 8, borderRadius: 4, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }}
        />
      </Box>
      <Typography sx={{ mt: 1.5, fontSize: 12, color: C.slate }}>
        {score >= 80 ? 'Excellent governance compliance' : score >= 60 ? 'Moderate — improvements recommended' : 'Low — review required'}
      </Typography>
    </Box>
  );
}

function SkeletonCard() {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Skeleton variant="rounded" width={44} height={44} />
      <Box sx={{ flex: 1 }}>
        <Skeleton width="50%" height={30} />
        <Skeleton width="70%" height={16} />
      </Box>
    </Paper>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/specs/dashboard/stats');
      setStats(res.data);
    } catch {
      setError('Failed to load analytics. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const pending = stats ? Math.max(0, stats.total_apis - stats.published_count - stats.rejected_count) : 0;
  const passRate = stats && stats.total_apis > 0 ? (stats.published_count / stats.total_apis * 100) : 0;
  const rejectRate = stats && stats.total_apis > 0 ? (stats.rejected_count / stats.total_apis * 100) : 0;
  const pendingRate = stats && stats.total_apis > 0 ? (pending / stats.total_apis * 100) : 0;

  const kpis = stats ? [
    { label: 'Total APIs', value: stats.total_apis, color: C.navy, bg: C.navyLt, icon: <IconApi size={20} color={C.navy} /> },
    { label: 'Published', value: stats.published_count, color: C.green, bg: C.greenLt, icon: <IconCircleCheck size={20} color={C.green} /> },
    { label: 'Rejected', value: stats.rejected_count, color: C.red, bg: C.redLt, icon: <IconCircleX size={20} color={C.red} /> },
    { label: 'Pending', value: pending, color: C.amber, bg: C.amberLt, icon: <IconClock size={20} color={C.amber} /> },
  ] : [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: 1.5, mb: 0.5 }}>
            Overview
          </Typography>
          <Typography sx={{ color: C.navy, fontWeight: 800, fontSize: 24 }}>Analytics</Typography>
          <Typography sx={{ color: C.slate, fontSize: 13 }}>Governance platform health and API statistics.</Typography>
        </Box>
        <Button
          startIcon={<IconRefresh size={15} />}
          onClick={fetchStats}
          variant="outlined"
          disabled={loading}
          sx={{ borderColor: C.border, color: C.slate, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: C.navy, color: C.navy } }}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Grid item xs={6} md={3} key={i}><SkeletonCard /></Grid>)
          : kpis.map(k => (
            <Grid item xs={6} md={3} key={k.label}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {k.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 26, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 12, color: C.slate, mt: 0.3 }}>{k.label}</Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy, mb: 2 }}>Health Score</Typography>
            {loading
              ? <Box sx={{ textAlign: 'center', py: 3 }}><Skeleton variant="circular" width={80} height={80} sx={{ mx: 'auto', mb: 1 }} /><Skeleton width="60%" sx={{ mx: 'auto' }} /></Box>
              : <ScoreGauge score={stats?.average_health_score ?? 0} />}
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy, mb: 3 }}>Publication Rate</Typography>
            {loading ? (
              <><Skeleton width="100%" height={24} sx={{ mb: 2 }} /><Skeleton width="80%" height={24} sx={{ mb: 2 }} /><Skeleton width="90%" height={24} /></>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12, color: C.slate }}>Published</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.green }}>{passRate.toFixed(1)}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={passRate}
                  sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', mb: 3, '& .MuiLinearProgress-bar': { bgcolor: C.green, borderRadius: 5 } }} />
                {[
                  { label: 'Published', value: stats?.published_count ?? 0, pct: passRate, color: C.green },
                  { label: 'Rejected', value: stats?.rejected_count ?? 0, pct: rejectRate, color: C.red },
                  { label: 'Pending', value: pending, pct: pendingRate, color: C.amber },
                ].map(row => (
                  <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: row.color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12, color: C.slate, flex: 1 }}>{row.label}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: row.color, minWidth: 24 }}>{row.value}</Typography>
                    <Typography sx={{ fontSize: 11, color: C.slate, width: 44, textAlign: 'right' }}>({row.pct.toFixed(0)}%)</Typography>
                  </Box>
                ))}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {!loading && stats?.total_apis === 0 && (
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: C.navyLt, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <IconChartBar size={24} color={C.navy} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: C.navy, mb: 0.5 }}>No data yet</Typography>
          <Typography sx={{ fontSize: 13, color: C.slate, mb: 2 }}>Upload your first API specification to start seeing analytics.</Typography>
          <Button onClick={() => navigate('/dashboard')} variant="contained"
            startIcon={<IconUpload size={15} />}
            sx={{ bgcolor: C.navy, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, boxShadow: 'none', '&:hover': { bgcolor: '#162d4a' } }}>
            Upload API Spec
          </Button>
        </Paper>
      )}
    </Box>
  );
}
