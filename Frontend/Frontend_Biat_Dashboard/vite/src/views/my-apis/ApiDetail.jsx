import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Button, Alert, Skeleton,
  Grid, Divider, IconButton, Collapse
} from '@mui/material';
import {
  IconArrowLeft, IconCircleCheck, IconCircleX, IconClock,
  IconRobot, IconCode, IconChevronDown, IconChevronUp, IconCopy
} from '@tabler/icons-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

const C = {
  navy: '#1e3a5f', navyLt: '#eef2f8',
  green: '#16a34a', greenLt: '#dcfce7',
  red: '#dc2626', redLt: '#fee2e2',
  amber: '#d97706', amberLt: '#fffbeb',
  slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc',
};

const statusMap = (s) => {
  if (s === 'PUBLISHED') return { bg: C.greenLt, color: C.green, icon: <IconCircleCheck size={14} />, label: 'Published' };
  if (s === 'REJECTED')  return { bg: C.redLt,   color: C.red,   icon: <IconCircleX size={14} />,   label: 'Rejected'  };
  return { bg: C.amberLt, color: C.amber, icon: <IconClock size={14} />, label: s || 'Pending' };
};

function InfoCard({ label, value, mono = false }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.navy, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

export default function ApiDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [yamlOpen, setYamlOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchSpec = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/specs/${id}`);
        setSpec(res.data);
      } catch (e) {
        setError(e.response?.status === 404 ? 'API specification not found.' : 'Failed to load specification.');
      } finally {
        setLoading(false);
      }
    };
    fetchSpec();
  }, [id]);

  const copyYaml = () => {
    if (spec?.raw_content) {
      navigator.clipboard.writeText(spec.raw_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sc = spec ? statusMap(spec.workflow_status) : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button
          startIcon={<IconArrowLeft size={15} />}
          onClick={() => navigate('/my-apis')}
          sx={{ color: C.slate, textTransform: 'none', fontSize: 13, fontWeight: 600, px: 1.5, '&:hover': { bgcolor: C.navyLt, color: C.navy } }}>
          My APIs
        </Button>
        <Typography sx={{ color: C.border }}>›</Typography>
        <Typography sx={{ fontSize: 13, color: C.navy, fontWeight: 600 }}>
          {loading ? <Skeleton width={120} sx={{ display: 'inline-block' }} /> : (spec?.title || `Spec #${id}`)}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, mb: 2 }}>
        {loading ? (
          <><Skeleton width="40%" height={34} /><Skeleton width="20%" height={20} sx={{ mt: 0.5 }} /></>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 22, color: C.navy }}>{spec?.title}</Typography>
              <Typography sx={{ fontSize: 13, color: C.slate, mt: 0.3 }}>Specification ID: #{spec?.id}</Typography>
            </Box>
            {sc && (
              <Chip
                icon={<Box sx={{ display: 'flex', pl: 0.5 }}>{sc.icon}</Box>}
                label={sc.label}
                sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: 12, height: 28 }}
              />
            )}
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy, mb: 2.5 }}>Details</Typography>
        {loading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={6} md={3} key={i}>
                <Skeleton width="60%" height={16} /><Skeleton width="80%" height={22} sx={{ mt: 0.5 }} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={6} md={3}><InfoCard label="Version" value={spec?.version} mono /></Grid>
            <Grid item xs={6} md={3}><InfoCard label="Submitted" value={spec?.created_at ? new Date(spec.created_at).toLocaleString('en-GB') : null} /></Grid>
            <Grid item xs={6} md={3}><InfoCard label="WSO2 ID" value={spec?.external_id} mono /></Grid>
            <Grid item xs={6} md={3}><InfoCard label="AI Fix Applied" value={spec?.suggestions_applied ? 'Yes ✓' : 'No'} /></Grid>
          </Grid>
        )}
      </Paper>

      {(loading || spec?.semantic_analysis) && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy, mb: 2.5 }}>Semantic Analysis</Typography>
          {loading ? (
            <Grid container spacing={3}>
              {[0, 1].map(i => <Grid item xs={6} key={i}><Skeleton width="50%" height={16} /><Skeleton width="70%" height={22} sx={{ mt: 0.5 }} /></Grid>)}
            </Grid>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={6} md={4}>
                <InfoCard
                  label="Redundant API"
                  value={spec.semantic_analysis.is_redundant ? 'Yes — similar API exists' : 'No — unique'}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <InfoCard
                  label="Similarity Score"
                  value={spec.semantic_analysis.similarity_score != null
                    ? `${(spec.semantic_analysis.similarity_score * 100).toFixed(1)}%`
                    : null}
                />
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {(loading || spec?.semantic_analysis?.ai_suggested_fix) && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: C.navyLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconRobot size={16} color={C.navy} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>AI Suggestions</Typography>
          </Box>
          {loading ? (
            <><Skeleton width="100%" /><Skeleton width="90%" /><Skeleton width="80%" /></>
          ) : (
            <Typography sx={{ fontSize: 13, color: C.slate, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
              {spec.semantic_analysis.ai_suggested_fix}
            </Typography>
          )}
        </Paper>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <Box
          sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', '&:hover': { bgcolor: C.bg } }}
          onClick={() => setYamlOpen(v => !v)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconCode size={16} color={C.slate} />
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Raw YAML</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!loading && spec?.raw_content && (
              <IconButton size="small" onClick={e => { e.stopPropagation(); copyYaml(); }}
                sx={{ color: copied ? C.green : C.slate, borderRadius: 1 }} title="Copy YAML">
                <IconCopy size={15} />
              </IconButton>
            )}
            {yamlOpen ? <IconChevronUp size={16} color={C.slate} /> : <IconChevronDown size={16} color={C.slate} />}
          </Box>
        </Box>
        <Collapse in={yamlOpen}>
          <Divider />
          <Box sx={{ p: 3, bgcolor: '#0f172a', maxHeight: 520, overflow: 'auto' }}>
            {loading
              ? <Skeleton variant="rectangular" height={200} sx={{ bgcolor: '#1e293b' }} />
              : <Typography component="pre" sx={{ fontSize: 12, color: '#e2e8f0', fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {spec?.raw_content || 'No content available.'}
                </Typography>}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
}
