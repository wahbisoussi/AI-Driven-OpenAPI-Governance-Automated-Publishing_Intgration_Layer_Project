import { useState, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, LinearProgress, Paper, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, CircularProgress, Grid, Divider
} from '@mui/material';
import {
  IconCloudUpload, IconCheck, IconX,
  IconBrain, IconShieldCheck, IconRocket, IconFileUpload, IconAlertCircle
} from '@tabler/icons-react';
import axios from 'axios';

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  navy:    '#1e3a5f',
  navyLt:  '#eef2f8',
  navyDk:  '#162d4a',
  green:   '#16a34a',
  greenLt: '#dcfce7',
  red:     '#dc2626',
  redLt:   '#fee2e2',
  amber:   '#d97706',
  amberLt: '#fffbeb',
  slate:   '#64748b',
  border:  '#e2e8f0',
  bg:      '#f8fafc',
  card:    '#ffffff',
};

const API_BASE = 'http://localhost:8000/api/v1';

const STEPS = [
  { id: 1, label: 'Import' },
  { id: 2, label: 'Audit' },
  { id: 3, label: 'AI Engine' },
  { id: 4, label: 'Gate' },
  { id: 5, label: 'Publish' }
];

const severityColor = (sev) => {
  if (sev === 'error' || sev === 0) return '#ef4444';
  if (sev === 'warn' || sev === 1) return '#f97316';
  return '#3b82f6';
};

const severityLabel = (sev) => {
  if (sev === 'error' || sev === 0) return 'Error';
  if (sev === 'warn' || sev === 1) return 'Warning';
  return 'Info';
};

function StepBar({ current }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3, border: `1px solid ${C.border}`, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {STEPS.map((step, idx) => {
          const done = current > step.id;
          const active = current === step.id;
          return (
            <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : 'none' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: done ? C.green : active ? C.navy : C.border,
                  color: done || active ? '#fff' : C.slate,
                  fontWeight: 700, fontSize: 13,
                  boxShadow: active ? `0 0 0 4px ${C.navyLt}` : 'none',
                  transition: 'all 0.3s'
                }}>
                  {done ? <IconCheck size={15} strokeWidth={3} /> : step.id}
                </Box>
                <Typography sx={{
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  color: done ? C.green : active ? C.navy : C.slate,
                  display: { xs: 'none', sm: 'block' }
                }}>
                  {step.label}
                </Typography>
              </Box>
              {idx < STEPS.length - 1 && (
                <Box sx={{ flex: 1, height: 1.5, mx: 1.5, borderRadius: 1,
                  bgcolor: done ? C.green : C.border, transition: 'background 0.3s' }} />
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

function ScoreGauge({ score }) {
  const color = score >= 80 ? C.green : score >= 50 ? C.amber : C.red;
  const colorLt = score >= 80 ? C.greenLt : score >= 50 ? C.amberLt : C.redLt;
  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Fair' : 'Poor';
  return (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1.5 }}>
        <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={60} cy={60} r={50} fill="none" stroke={C.border} strokeWidth={10} />
          <circle cx={60} cy={60} r={50} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={314} strokeDashoffset={314 - (score / 100) * 314}
            style={{ transition: 'stroke-dashoffset 1.2s ease' }} strokeLinecap="round" />
        </svg>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 26, color, lineHeight: 1 }}>{score}</Typography>
          <Typography sx={{ fontSize: 10, color: C.slate, textTransform: 'uppercase', letterSpacing: 1 }}>/ 100</Typography>
        </Box>
      </Box>
      <Chip label={label} size="small" sx={{ bgcolor: colorLt, color, fontWeight: 700, fontSize: 11 }} />
    </Box>
  );
}

export default function UploadPipeline() {
  const [step, setStep] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [deployLog, setDeployLog] = useState([]);
  const inputRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const simulateDeployLog = () => {
    const logs = [
      { text: 'Connecting to BIAT WSO2 Gateway...', delay: 300 },
      { text: 'Authenticating Governance Policy... OK', delay: 900 },
      { text: 'Uploading OpenAPI 3.0 Definition...', delay: 1600 },
      { text: 'Creating API Revision...', delay: 2300 },
      { text: 'Deploying to Default Gateway...', delay: 3000 },
      { text: 'Triggering Lifecycle → Published...', delay: 3800 },
      { text: 'INFO: Status: 100% Deployed ✓', delay: 4500, success: true }
    ];
    logs.forEach(({ text, delay, success }) => {
      setTimeout(() => setDeployLog(prev => [...prev, { text, success }]), delay);
    });
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setDeployLog([]);
    setStep(2);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await new Promise(r => setTimeout(r, 1200));
      setStep(3);
      await new Promise(r => setTimeout(r, 1000));
      setStep(4);

      const res = await axios.post(`${API_BASE}/specs/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(res.data);
      setStep(5);
      simulateDeployLog();
    } catch (err) {
      setError(err.response?.data?.detail || 'Pipeline failed. Check your YAML file.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setFile(null); setResult(null); setError(null); setDeployLog([]);
  };

  const violations = result?.violations || [];
  const errors = violations.filter(v => v.severity === 0 || v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 1 || v.severity === 'warn');
  const score = result?.structural_score ?? 0;
  const passed = result?.governance_decision === 'APPROVED';
  const aiSimilarity = result?.ai_analysis?.similarity ?? 0;
  const aiSuggestions = result?.ai_analysis?.suggestions ?? '';
  const refactoredYaml = result?.refactored_yaml ?? '';
  const originalYaml = file ? '(original file content)' : '';

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: 1.5, mb: 0.5 }}>
          Governance Pipeline
        </Typography>
        <Typography variant="h3" sx={{ color: C.navy, fontWeight: 800, mb: 0.5, fontSize: 24 }}>New API Submission</Typography>
        <Typography sx={{ color: C.slate, fontSize: 13 }}>
          Upload your OpenAPI specification to run the full automated governance audit.
        </Typography>
      </Box>

      <StepBar current={step} />

      {/* ── STEP 1: UPLOAD ── */}
      {step === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper variant="outlined" sx={{ p: 3.5, borderRadius: 2, border: `1px solid ${C.border}` }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: C.navy, mb: 0.5 }}>Import API Definition</Typography>
              <Typography sx={{ color: C.slate, mb: 2.5, fontSize: 13 }}>
                Supported formats: OpenAPI 3.x · JSON or YAML · Max 20 MB
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

              <Box
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => inputRef.current.click()}
                sx={{
                  border: `2px dashed ${dragging ? C.navy : file ? C.green : C.border}`,
                  borderRadius: 2, p: 5, textAlign: 'center', cursor: 'pointer',
                  bgcolor: dragging ? C.navyLt : file ? C.greenLt : C.bg,
                  transition: 'all 0.2s', mb: 2.5
                }}>
                <input ref={inputRef} type="file" accept=".yaml,.yml,.json" hidden onChange={e => setFile(e.target.files[0])} />
                {file ? (
                  <>
                    <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                      <IconCheck size={24} color={C.green} strokeWidth={2.5} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{file.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: C.slate, mt: 0.5 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</Typography>
                  </>
                ) : (
                  <>
                    <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: C.navyLt, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                      <IconCloudUpload size={22} color={C.navy} />
                    </Box>
                    <Typography sx={{ fontWeight: 600, color: C.navy, fontSize: 14 }}>Drop your file here</Typography>
                    <Typography sx={{ fontSize: 12, color: C.slate, mt: 0.5 }}>or click to browse</Typography>
                  </>
                )}
              </Box>

              <Button
                fullWidth variant="contained" disabled={!file} onClick={handleSubmit}
                startIcon={<IconFileUpload size={16} />}
                sx={{ bgcolor: C.navy, '&:hover': { bgcolor: C.navyDk }, py: 1.4, borderRadius: 1.5, fontWeight: 700, fontSize: 14, textTransform: 'none', boxShadow: 'none' }}>
                Run Governance Pipeline
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IconShieldCheck size={18} color={C.navy} />
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Active Ruleset</Typography>
              </Box>
              {[['Microsoft REST', 'Guidelines'], ['Spectral OAS', 'Linter'], ['BIAT Security', 'Rules'], ['Documentation', 'Rules']].map(([name, type]) => (
                <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.2, borderBottom: `1px solid ${C.border}`, '&:last-child': { borderBottom: 0 } }}>
                  <Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{name}</Typography>
                    <Typography sx={{ fontSize: 11, color: C.slate }}>{type}</Typography>
                  </Box>
                  <Chip label="ON" size="small" sx={{ bgcolor: C.greenLt, color: C.green, fontWeight: 700, fontSize: 10, height: 20 }} />
                </Box>
              ))}
            </Paper>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: C.navy, border: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#fff', mb: 0.5 }}>Need Help?</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', mb: 2, lineHeight: 1.6 }}>
                Check the BIAT API Style Guide before submitting your definition.
              </Typography>
              <Button variant="outlined" fullWidth
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 1.5, textTransform: 'none', fontWeight: 600, fontSize: 12, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.5)' } }}
                href="/Docs/API-Style-Guide.md" target="_blank">
                View Style Guide →
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── STEPS 2-4: LOADING ── */}
      {loading && (
        <Paper variant="outlined" sx={{ p: 6, borderRadius: 2, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: C.navyLt, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <CircularProgress size={32} sx={{ color: C.navy }} thickness={4} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: C.navy, mb: 0.5 }}>
            {step === 2 && 'Running Structural Audit'}
            {step === 3 && 'AI Engine Analyzing'}
            {step === 4 && 'Governance Gate Evaluating'}
          </Typography>
          <Typography sx={{ color: C.slate, fontSize: 13, mb: 3 }}>
            {step === 2 && 'Checking against Microsoft REST Guidelines & BIAT security standards'}
            {step === 3 && 'Qwen 2.5 is reviewing your specification for semantic issues'}
            {step === 4 && 'Calculating final governance score and decision...'}
          </Typography>
          <LinearProgress sx={{ maxWidth: 320, mx: 'auto', borderRadius: 2, height: 4, bgcolor: C.navyLt, '& .MuiLinearProgress-bar': { bgcolor: C.navy } }} />
        </Paper>
      )}

      {/* ── STEP 5: RESULTS ── */}
      {result && step === 5 && (
        <Box>
          {/* Top stat cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Structural Score', value: `${score}%`, color: score >= 80 ? C.green : C.red, bg: score >= 80 ? C.greenLt : C.redLt },
              { label: 'Errors Found', value: errors.length, color: errors.length === 0 ? C.green : C.red, bg: errors.length === 0 ? C.greenLt : C.redLt },
              { label: 'Warnings', value: warnings.length, color: C.amber, bg: C.amberLt },
              { label: 'Gate Decision', value: passed ? 'PASS' : 'FAIL', color: passed ? C.green : C.red, bg: passed ? C.greenLt : C.redLt }
            ].map(s => (
              <Grid item xs={6} md={3} key={s.label}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: C.slate, mt: 0.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Governance Gate banner */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3, border: `1.5px solid ${passed ? C.green : C.red}`, bgcolor: passed ? C.greenLt : C.redLt }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {passed ? <IconShieldCheck size={24} color={C.green} /> : <IconAlertCircle size={24} color={C.red} />}
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: passed ? C.green : C.red }}>
                  {passed ? 'Governance Gate — APPROVED' : 'Governance Gate — REJECTED'}
                </Typography>
                <Typography sx={{ fontSize: 12, color: C.slate }}>
                  {passed
                    ? 'All checks passed. API is being auto-published to WSO2 Gateway.'
                    : `Score ${score}% is below the 80% minimum threshold required for publication.`}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, height: '100%' }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy, mb: 1 }}>Structural Score</Typography>
                <ScoreGauge score={score} />
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 22, color: C.red }}>{errors.length}</Typography>
                    <Typography sx={{ fontSize: 11, color: C.slate }}>Errors</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 22, color: C.amber }}>{warnings.length}</Typography>
                    <Typography sx={{ fontSize: 11, color: C.slate }}>Warnings</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={8}>
              {aiSuggestions && (
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <IconBrain size={18} color={C.navy} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>AI Engine Recommendations</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: C.slate, whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 200, overflow: 'auto' }}>
                    {aiSuggestions.slice(0, 600)}{aiSuggestions.length > 600 ? '...' : ''}
                  </Typography>
                </Paper>
              )}
            </Grid>
          </Grid>

          {/* Violations Table */}
          {violations.length > 0 && (
            <Paper variant="outlined" sx={{ borderRadius: 2, mb: 3, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Linter Findings</Typography>
                <Chip label={`${violations.length} issues`} size="small" sx={{ bgcolor: C.redLt, color: C.red, fontWeight: 700, fontSize: 11 }} />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: C.bg }}>
                      {['Severity', 'Rule', 'Message', 'Path'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: C.slate, textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {violations.slice(0, 20).map((v, i) => {
                      const sc = v.severity === 0 || v.severity === 'error' ? { c: C.red, bg: C.redLt, l: 'Error' } : v.severity === 1 || v.severity === 'warn' ? { c: C.amber, bg: C.amberLt, l: 'Warning' } : { c: C.navy, bg: C.navyLt, l: 'Info' };
                      return (
                        <TableRow key={i} hover sx={{ '&:hover': { bgcolor: C.bg } }}>
                          <TableCell sx={{ py: 1.5 }}>
                            <Chip label={sc.l} size="small" sx={{ bgcolor: sc.bg, color: sc.c, fontWeight: 700, fontSize: 10 }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: C.navy, fontWeight: 600 }}>{v.code || '-'}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: C.slate, maxWidth: 280 }}>{v.message}</TableCell>
                          <TableCell sx={{ fontSize: 11, color: C.slate, fontFamily: 'monospace' }}>
                            {Array.isArray(v.path) ? v.path.join(' › ') : v.path || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* AI Optimized YAML */}
          {refactoredYaml && (
            <Paper variant="outlined" sx={{ borderRadius: 2, mb: 3, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconBrain size={16} color={C.navy} />
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>AI Optimized Specification</Typography>
                <Chip label="OPTIMIZED" size="small" sx={{ bgcolor: C.navyLt, color: C.navy, fontWeight: 700, fontSize: 10 }} />
              </Box>
              <Box sx={{ bgcolor: '#0f172a', p: 2.5, maxHeight: 280, overflow: 'auto' }}>
                <pre style={{ margin: 0, color: '#94a3b8', fontSize: 12, fontFamily: '"Fira Code", monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {refactoredYaml.slice(0, 2000)}{refactoredYaml.length > 2000 ? '\n...' : ''}
                </pre>
              </Box>
            </Paper>
          )}

          {/* WSO2 Terminal */}
          {passed && (
            <Paper variant="outlined" sx={{ borderRadius: 2, mb: 3, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconRocket size={16} color={C.navy} />
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>WSO2 Gateway Deployment</Typography>
                {result.final_status === 'PUBLISHED' && (
                  <Chip label="PUBLISHED" size="small" sx={{ bgcolor: C.greenLt, color: C.green, fontWeight: 700 }} />
                )}
              </Box>
              <Box sx={{ bgcolor: '#0f172a', p: 2.5, minHeight: 130 }}>
                {deployLog.map((log, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
                    <Typography sx={{ color: C.green, fontSize: 12, fontFamily: 'monospace', flexShrink: 0 }}>$</Typography>
                    <Typography sx={{ color: log.success ? C.green : '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>{log.text}</Typography>
                  </Box>
                ))}
                {deployLog.length === 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={12} sx={{ color: C.green }} />
                    <Typography sx={{ color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>Initializing connection...</Typography>
                  </Box>
                )}
              </Box>
              {result.wso2_id && (
                <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${C.border}` }}>
                  <Typography sx={{ fontSize: 11, color: C.slate, fontFamily: 'monospace' }}>Deployment ID: {result.wso2_id}</Typography>
                </Box>
              )}
            </Paper>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={reset}
              sx={{ borderColor: C.navy, color: C.navy, borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>
              ← New Submission
            </Button>
            <Button variant="contained" href="/my-apis" component="a"
              sx={{ bgcolor: C.navy, '&:hover': { bgcolor: C.navyDk }, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}>
              View in My APIs
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
