import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Button, Alert, Skeleton,
  Grid, Divider, IconButton, Collapse, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  IconArrowLeft, IconCircleCheck, IconCircleX, IconClock,
  IconRobot, IconCode, IconChevronDown, IconChevronUp, IconCopy,
  IconShieldCheck
} from '@tabler/icons-react';
import api from 'services/api';

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

function scoreColor(s) {
  if (s >= 80) return '#16a34a';
  if (s >= 60) return '#d97706';
  return '#dc2626';
}

function severityStyle(s) {
  if (s === 'ERROR')   return { bg: '#fee2e2', color: '#dc2626' };
  if (s === 'WARNING') return { bg: '#fffbeb', color: '#d97706' };
  return { bg: '#f1f5f9', color: '#64748b' };
}

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
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setReportLoading(true);
      try {
        const [specRes, reportRes] = await Promise.all([
          api.get(`/specs/${id}`),
          api.get(`/specs/${id}/report`),
        ]);
        setSpec(specRes.data);
        setReport(reportRes.data);
      } catch (e) {
        setError(e.response?.status === 404 ? 'API specification not found.' : 'Failed to load specification.');
      } finally {
        setLoading(false);
        setReportLoading(false);
      }
    };
    fetchAll();
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

      {/* Governance Report */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: C.navyLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconShieldCheck size={16} color={C.navy} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Governance Report</Typography>
          </Box>
          {!reportLoading && report?.structural && (
            <Chip
              label={report.structural.isPassed ? 'PASSED' : 'FAILED'}
              size="small"
              sx={{ bgcolor: report.structural.isPassed ? C.greenLt : C.redLt, color: report.structural.isPassed ? C.green : C.red, fontWeight: 700, fontSize: 11 }}
            />
          )}
        </Box>

        {reportLoading ? (
          <><Skeleton width="100%" height={24} sx={{ mb: 1 }} /><Skeleton width="60%" height={24} /></>
        ) : !report?.structural ? (
          <Typography sx={{ fontSize: 13, color: C.slate }}>No governance report available for this specification.</Typography>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Score</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 36, fontWeight: 900, color: scoreColor(report.structural.score), lineHeight: 1 }}>{report.structural.score}</Typography>
                  <Typography sx={{ fontSize: 13, color: C.slate }}>/100</Typography>
                </Box>
                <LinearProgress variant="determinate" value={report.structural.score}
                  sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: scoreColor(report.structural.score), borderRadius: 3 } }} />
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Errors</Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: report.structural.total_errors > 0 ? C.red : C.green }}>{report.structural.total_errors}</Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Warnings</Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: report.structural.total_warnings > 0 ? C.amber : C.green }}>{report.structural.total_warnings}</Typography>
              </Grid>
              {report.governance && (
                <Grid item xs={12} md={5}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Decision Reason</Typography>
                  <Typography sx={{ fontSize: 12, color: C.slate, lineHeight: 1.7 }}>{report.governance.reason}</Typography>
                </Grid>
              )}
            </Grid>

            {report.structural.violations?.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
                  Violations ({report.structural.violations.length})
                </Typography>
                <TableContainer sx={{ border: `1px solid ${C.border}`, borderRadius: 1.5, overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: C.bg }}>
                        {['Severity', 'Rule', 'Message', 'Line'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: C.slate, textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.structural.violations.map(v => {
                        const sev = severityStyle(v.severity);
                        return (
                          <TableRow key={v.id} sx={{ '&:hover': { bgcolor: C.bg } }}>
                            <TableCell sx={{ py: 1.2 }}>
                              <Chip label={v.severity} size="small" sx={{ bgcolor: sev.bg, color: sev.color, fontWeight: 700, fontSize: 10, height: 20 }} />
                            </TableCell>
                            <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: C.navy, fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {v.rule_name}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: C.slate }}>{v.message}</TableCell>
                            <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: C.slate }}>{v.line_number ?? '—'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}
      </Paper>

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
