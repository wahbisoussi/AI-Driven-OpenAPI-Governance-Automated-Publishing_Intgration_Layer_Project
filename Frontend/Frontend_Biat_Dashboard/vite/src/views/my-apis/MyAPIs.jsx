import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, CircularProgress,
  Alert, Button, TextField, InputAdornment
} from '@mui/material';
import { IconTrash, IconSearch, IconRefresh, IconApi } from '@tabler/icons-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

const statusColor = (status) => {
  if (!status) return { bg: '#f1f5f9', color: '#64748b' };
  if (status === 'PUBLISHED') return { bg: '#f0fdf4', color: '#22c55e' };
  if (status === 'APPROVED') return { bg: '#eff6ff', color: '#3b82f6' };
  if (status === 'REJECTED') return { bg: '#fef2f2', color: '#ef4444' };
  return { bg: '#fefce8', color: '#ca8a04' };
};

export default function MyAPIs() {
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetchSpecs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/specs/all_specs`);
      setSpecs(res.data);
    } catch {
      setError('Failed to load API specifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSpecs(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this specification?')) return;
    setDeleting(id);
    try {
      await axios.delete(`${API_BASE}/specs/${id}`);
      setSpecs(prev => prev.filter(s => s.id !== id));
    } catch {
      alert('Failed to delete specification.');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = specs.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.version?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h3" sx={{ color: '#1e3a5f', fontWeight: 700 }}>My APIs</Typography>
          <Typography sx={{ color: '#64748b', mt: 0.5 }}>
            All API specifications submitted through the governance pipeline.
          </Typography>
        </Box>
        <Button
          startIcon={<IconRefresh size={16} />}
          onClick={fetchSpecs}
          variant="outlined"
          sx={{ borderColor: '#1e3a5f', color: '#1e3a5f', borderRadius: 2 }}>
          Refresh
        </Button>
      </Box>

      {/* Stats row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: specs.length, color: '#1e3a5f' },
          { label: 'Published', value: specs.filter(s => s.workflow_status === 'PUBLISHED').length, color: '#22c55e' },
          { label: 'Rejected', value: specs.filter(s => s.workflow_status === 'REJECTED').length, color: '#ef4444' },
          { label: 'Pending', value: specs.filter(s => !['PUBLISHED', 'REJECTED'].includes(s.workflow_status)).length, color: '#f97316' }
        ].map(stat => (
          <Paper key={stat.label} sx={{ px: 3, py: 2, borderRadius: 3, minWidth: 120, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, fontSize: 28, color: stat.color, lineHeight: 1 }}>{stat.value}</Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.5 }}>{stat.label}</Typography>
          </Paper>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #f1f5f9' }}>
          <TextField
            placeholder="Search by title or version..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <InputAdornment position="start"><IconSearch size={16} color="#94a3b8" /></InputAdornment>
            }}
            sx={{ width: 300 }}
          />
        </Box>

        {loading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <CircularProgress sx={{ color: '#1e3a5f' }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <IconApi size={48} color="#cbd5e1" />
            <Typography sx={{ color: '#94a3b8', mt: 1 }}>
              {search ? 'No results found.' : 'No API specifications yet. Upload your first spec!'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {['ID', 'Title', 'Version', 'Status', 'WSO2 ID', 'Submitted', ''].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#374151' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(spec => {
                  const sc = statusColor(spec.workflow_status);
                  return (
                    <TableRow key={spec.id} hover>
                      <TableCell sx={{ fontSize: 13, color: '#94a3b8' }}>#{spec.id}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{spec.title || '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{spec.version || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={spec.workflow_status || 'UNKNOWN'}
                          size="small"
                          sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>
                        {spec.external_id ? spec.external_id.slice(0, 12) + '...' : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#94a3b8' }}>
                        {spec.created_at ? new Date(spec.created_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(spec.id)}
                          disabled={deleting === spec.id}
                          sx={{ color: '#ef4444' }}>
                          {deleting === spec.id
                            ? <CircularProgress size={16} />
                            : <IconTrash size={16} />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
