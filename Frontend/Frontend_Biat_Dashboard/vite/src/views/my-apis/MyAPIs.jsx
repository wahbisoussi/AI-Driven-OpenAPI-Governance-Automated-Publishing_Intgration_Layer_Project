import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, CircularProgress,
  Alert, Button, TextField, InputAdornment, Grid, Skeleton, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { IconTrash, IconSearch, IconRefresh, IconApi, IconCircleCheck, IconCircleX, IconClock, IconChevronRight } from '@tabler/icons-react';
import api from 'services/api';
import { useToast } from 'contexts/ToastContext';

const C = {
  navy: '#1e3a5f', navyLt: '#eef2f8', navyDk: '#162d4a',
  green: '#16a34a', greenLt: '#dcfce7',
  red: '#dc2626', redLt: '#fee2e2',
  amber: '#d97706', amberLt: '#fffbeb',
  slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc',
};

const statusMap = (s) => {
  if (s === 'PUBLISHED') return { bg: C.greenLt, color: C.green, icon: <IconCircleCheck size={12} /> };
  if (s === 'REJECTED')  return { bg: C.redLt,   color: C.red,   icon: <IconCircleX size={12} /> };
  if (s === 'APPROVED')  return { bg: C.navyLt,  color: C.navy,  icon: <IconCircleCheck size={12} /> };
  return { bg: C.amberLt, color: C.amber, icon: <IconClock size={12} /> };
};

export default function MyAPIs() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const fetchSpecs = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/specs/all_specs');
      setSpecs(res.data);
    } catch { setError('Failed to load API specifications. Ensure the backend is running.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSpecs(); }, []);

  const handleDelete = async () => {
    const id = confirmId;
    setConfirmId(null);
    setDeleting(id);
    try {
      await api.delete(`/specs/${id}`);
      setSpecs(prev => prev.filter(s => s.id !== id));
      showToast('Specification deleted successfully.', 'success');
    } catch {
      showToast('Failed to delete specification.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = specs.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.version?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total APIs', value: specs.length, color: C.navy, bg: C.navyLt },
    { label: 'Published', value: specs.filter(s => s.workflow_status === 'PUBLISHED').length, color: C.green, bg: C.greenLt },
    { label: 'Rejected', value: specs.filter(s => s.workflow_status === 'REJECTED').length, color: C.red, bg: C.redLt },
    { label: 'Pending', value: specs.filter(s => !['PUBLISHED', 'REJECTED'].includes(s.workflow_status)).length, color: C.amber, bg: C.amberLt },
  ];

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: 1.5, mb: 0.5 }}>
            API Catalog
          </Typography>
          <Typography sx={{ color: C.navy, fontWeight: 800, fontSize: 24 }}>My APIs</Typography>
          <Typography sx={{ color: C.slate, fontSize: 13 }}>
            All specifications submitted through the governance pipeline.
          </Typography>
        </Box>
        <Button
          startIcon={<IconRefresh size={15} />} onClick={fetchSpecs} variant="outlined"
          sx={{ borderColor: C.border, color: C.slate, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: C.navy, color: C.navy } }}>
          Refresh
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map(s => (
          <Grid item xs={6} md={3} key={s.label}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: s.color }}>{s.value}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 20, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                <Typography sx={{ fontSize: 12, color: C.slate, lineHeight: 1.2, mt: 0.3 }}>{s.label}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

      {/* Table Card */}
      <Paper variant="outlined" sx={{ borderRadius: 2, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {/* Toolbar */}
        <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            placeholder="Search by title or version..."
            value={search} onChange={e => setSearch(e.target.value)}
            size="small"
            InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={15} color={C.slate} /></InputAdornment> }}
            sx={{ width: 280, '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 13 } }}
          />
          {search && (
            <Typography sx={{ fontSize: 12, color: C.slate }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Typography>
          )}
        </Box>

        {loading ? (
          <Box sx={{ p: 3 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: `1px solid ${C.border}` }}>
                <Skeleton width={32} height={20} />
                <Skeleton width={160} height={20} sx={{ flex: 1 }} />
                <Skeleton width={60} height={24} />
                <Skeleton width={90} height={24} />
                <Skeleton width={80} height={20} />
                <Skeleton width={80} height={20} />
                <Skeleton variant="circular" width={28} height={28} />
              </Box>
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: C.navyLt, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <IconApi size={24} color={C.navy} />
            </Box>
            <Typography sx={{ fontWeight: 600, color: C.navy, fontSize: 14 }}>
              {search ? 'No matching APIs' : 'No APIs yet'}
            </Typography>
            <Typography sx={{ color: C.slate, fontSize: 13, mt: 0.5 }}>
              {search ? 'Try a different search term.' : 'Upload your first OpenAPI specification to get started.'}
            </Typography>
            {!search && (
              <Button href="/dashboard" variant="contained"
                sx={{ mt: 2, bgcolor: C.navy, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}>
                Upload API Spec
              </Button>
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: C.bg }}>
                  {['#', 'API Title', 'Version', 'Status', 'WSO2 ID', 'Submitted', ''].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: C.slate, textTransform: 'uppercase', letterSpacing: 0.6, py: 1.5, borderBottom: `1px solid ${C.border}` }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(spec => {
                  const sc = statusMap(spec.workflow_status);
                  return (
                    <TableRow
                      key={spec.id}
                      onClick={() => navigate(`/my-apis/${spec.id}`)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: C.navyLt }, transition: 'background 0.15s' }}>
                      <TableCell sx={{ fontSize: 12, color: C.slate, fontFamily: 'monospace', width: 48 }}>
                        {spec.id}
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{spec.title || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={spec.version || 'n/a'} size="small"
                          sx={{ bgcolor: C.navyLt, color: C.navy, fontWeight: 600, fontSize: 11, fontFamily: 'monospace' }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<Box sx={{ display: 'flex', pl: 0.5 }}>{sc.icon}</Box>}
                          label={spec.workflow_status || 'UNKNOWN'}
                          size="small"
                          sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: C.slate }}>
                        {spec.external_id ? spec.external_id.slice(0, 10) + '…' : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: C.slate, whiteSpace: 'nowrap' }}>
                        {spec.created_at ? new Date(spec.created_at).toLocaleDateString('en-GB') : '—'}
                      </TableCell>
                      <TableCell sx={{ width: 72 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton size="small"
                            onClick={e => { e.stopPropagation(); setConfirmId(spec.id); }}
                            disabled={deleting === spec.id}
                            sx={{ color: C.slate, '&:hover': { color: C.red, bgcolor: C.redLt }, borderRadius: 1 }}>
                            {deleting === spec.id ? <CircularProgress size={14} /> : <IconTrash size={15} />}
                          </IconButton>
                          <IconChevronRight size={14} color={C.slate} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${C.border}`, bgcolor: C.bg }}>
            <Typography sx={{ fontSize: 12, color: C.slate }}>
              Showing {filtered.length} of {specs.length} API{specs.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        )}
      </Paper>

      <Dialog open={!!confirmId} onClose={() => setConfirmId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#1e3a5f' }}>Delete Specification</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 13 }}>
            This will permanently remove the specification and all associated reports. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirmId(null)} variant="outlined"
            sx={{ borderColor: C.border, color: C.slate, textTransform: 'none', fontWeight: 600, borderRadius: 1.5, '&:hover': { borderColor: C.navy, color: C.navy } }}>
            Cancel
          </Button>
          <Button onClick={handleDelete} variant="contained"
            sx={{ bgcolor: C.red, textTransform: 'none', fontWeight: 600, borderRadius: 1.5, boxShadow: 'none', '&:hover': { bgcolor: '#b91c1c' } }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
