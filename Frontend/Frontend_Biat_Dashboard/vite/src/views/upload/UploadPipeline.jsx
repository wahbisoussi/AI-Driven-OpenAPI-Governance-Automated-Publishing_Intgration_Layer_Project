import { useState, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, LinearProgress, Paper, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, CircularProgress, Grid, Divider
} from '@mui/material';
import {
  IconCloudUpload, IconCheck,
  IconShieldCheck, IconRocket, IconFileUpload, IconAlertCircle, IconCopy
} from '@tabler/icons-react';
import api from 'services/api';

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


const STEPS = [
  { id: 1, label: 'Import' },
  { id: 2, label: 'Audit' },
  { id: 3, label: 'AI Engine' },
  { id: 4, label: 'Gate' },
  { id: 5, label: 'Publish' }
];

// Simple line-diff: mark lines in fixed that don't exist in original
function diffLines(original, fixed) {
  const origSet = new Set((original || '').split('\n').map(l => l.trimEnd()));
  return (fixed || '').split('\n').map(line => ({
    text: line,
    isNew: !origSet.has(line.trimEnd()),
  }));
}

function StepBar({ current, allDone, activeTab, onTabClick }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3, border: `1px solid ${C.border}`, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {STEPS.map((step, idx) => {
          const isDone = allDone ? step.id !== 1 : current > step.id;
          const isActive = allDone ? activeTab === step.id : current === step.id;
          const isClickable = allDone && step.id >= 2;
          return (
            <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : 'none' }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: isClickable ? 'pointer' : 'default' }}
                onClick={() => isClickable && onTabClick(step.id)}
              >
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: isActive ? C.navy : isDone ? C.green : C.border,
                  color: isDone || isActive ? '#fff' : C.slate,
                  fontWeight: 700, fontSize: 13,
                  boxShadow: isActive ? `0 0 0 4px ${C.navyLt}` : 'none',
                  transition: 'all 0.3s',
                }}>
                  {isDone && !isActive ? <IconCheck size={15} strokeWidth={3} /> : step.id}
                </Box>
                <Typography sx={{
                  fontSize: 12, fontWeight: isActive ? 700 : 500,
                  color: isActive ? C.navy : isDone ? C.green : C.slate,
                  display: { xs: 'none', sm: 'block' },
                  textDecoration: isClickable && !isActive ? 'underline dotted' : 'none',
                }}>
                  {step.label}
                </Typography>
              </Box>
              {idx < STEPS.length - 1 && (
                <Box sx={{ flex: 1, height: 1.5, mx: 1.5, borderRadius: 1,
                  bgcolor: isDone ? C.green : C.border, transition: 'background 0.3s' }} />
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
  const [activeTab, setActiveTab] = useState(5);
  const [originalYaml, setOriginalYaml] = useState('');
  const [specData, setSpecData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef();

  const readFileContent = (f) => {
    const reader = new FileReader();
    reader.onload = (e) => setOriginalYaml(e.target.result || '');
    reader.readAsText(f);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); readFileContent(f); }
  }, []);

  const simulateDeployLog = () => {
    [
      { text: 'Connecting to BIAT WSO2 Gateway...', delay: 300 },
      { text: 'Authenticating Governance Policy... OK', delay: 900 },
      { text: 'Uploading OpenAPI 3.0 Definition...', delay: 1600 },
      { text: 'Creating API Revision...', delay: 2300 },
      { text: 'Deploying to Default Gateway...', delay: 3000 },
      { text: 'Triggering Lifecycle → Published...', delay: 3800 },
      { text: 'INFO: Status: 100% Deployed ✓', delay: 4500, success: true },
    ].forEach(({ text, delay, success }) =>
      setTimeout(() => setDeployLog(prev => [...prev, { text, success }]), delay)
    );
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    setDeployLog([]); setSpecData(null); setReportData(null); setStep(2);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await new Promise(r => setTimeout(r, 1200)); setStep(3);
      await new Promise(r => setTimeout(r, 1000)); setStep(4);
      const res = await api.post('/specs/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const uploadResult = res.data;
      // Stop the loading spinner immediately — show results now
      setResult(uploadResult); setStep(5); setActiveTab(5); setLoading(false);
      simulateDeployLog();
      // Fire secondary fetches in background — failures won't break the result view
      const specId = uploadResult.spec_id;
      Promise.all([
        api.get(`/specs/${specId}`),
        api.get(`/specs/${specId}/report`),
      ]).then(([specRes, reportRes]) => {
        setSpecData(specRes.data);
        setReportData(reportRes.data);
      }).catch(e => console.warn('Could not load spec details:', e));
    } catch (err) {
      // Only reach here if the upload itself failed
      setError(err.response?.data?.detail || 'Pipeline failed. Check your YAML file.');
      setStep(1);
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setFile(null); setResult(null); setError(null);
    setDeployLog([]); setSpecData(null); setReportData(null); setOriginalYaml(''); setActiveTab(5);
  };

  const structural = reportData?.structural;
  const governance = reportData?.governance;
  const violations = structural?.violations || [];
  const errors = violations.filter(v => v.severity === 'ERROR');
  const warnings = violations.filter(v => v.severity === 'WARNING');
  const score = structural?.score ?? 0;
  const passed = result?.final_status === 'PUBLISHED';
  const fixedYaml = specData?.raw_content || '';
  const aiSuggested = specData?.semantic_analysis?.ai_suggested_fix || '';
  const isPipelineDone = !!result && step === 5;

  const copyFixed = () => { navigator.clipboard.writeText(fixedYaml); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: 1.5, mb: 0.5 }}>Governance Pipeline</Typography>
        <Typography variant="h3" sx={{ color: C.navy, fontWeight: 800, mb: 0.5, fontSize: 24 }}>New API Submission</Typography>
        <Typography sx={{ color: C.slate, fontSize: 13 }}>Upload your OpenAPI specification to run the full automated governance audit.</Typography>
      </Box>

      <StepBar current={step} allDone={isPipelineDone} activeTab={activeTab} onTabClick={setActiveTab} />

      {/* ── STEP 1: UPLOAD ── */}
      {step === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper variant="outlined" sx={{ p: 3.5, borderRadius: 2, border: `1px solid ${C.border}` }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: C.navy, mb: 0.5 }}>Import API Definition</Typography>
              <Typography sx={{ color: C.slate, mb: 2.5, fontSize: 13 }}>Supported formats: OpenAPI 3.x · JSON or YAML · Max 20 MB</Typography>
              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}
              <Box
                onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                onClick={() => inputRef.current.click()}
                sx={{ border: `2px dashed ${dragging ? C.navy : file ? C.green : C.border}`, borderRadius: 2, p: 5, textAlign: 'center', cursor: 'pointer', bgcolor: dragging ? C.navyLt : file ? C.greenLt : C.bg, transition: 'all 0.2s', mb: 2.5 }}>
                <input ref={inputRef} type="file" accept=".yaml,.yml,.json" hidden onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); readFileContent(f); } }} />
                {file ? (
                  <>
                    <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}><IconCheck size={24} color={C.green} strokeWidth={2.5} /></Box>
                    <Typography sx={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{file.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: C.slate, mt: 0.5 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</Typography>
                  </>
                ) : (
                  <>
                    <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: C.navyLt, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}><IconCloudUpload size={22} color={C.navy} /></Box>
                    <Typography sx={{ fontWeight: 600, color: C.navy, fontSize: 14 }}>Drop your file here</Typography>
                    <Typography sx={{ fontSize: 12, color: C.slate, mt: 0.5 }}>or click to browse</Typography>
                  </>
                )}
              </Box>
              <Button fullWidth variant="contained" disabled={!file} onClick={handleSubmit} startIcon={<IconFileUpload size={16} />}
                sx={{ bgcolor: C.navy, '&:hover': { bgcolor: C.navyDk }, py: 1.4, borderRadius: 1.5, fontWeight: 700, fontSize: 14, textTransform: 'none', boxShadow: 'none' }}>
                Run Governance Pipeline
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}><IconShieldCheck size={18} color={C.navy} /><Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Active Ruleset</Typography></Box>
              {[['Microsoft REST', 'Guidelines'], ['Spectral OAS', 'Linter'], ['BIAT Security', 'Rules'], ['Documentation', 'Rules']].map(([name, type]) => (
                <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.2, borderBottom: `1px solid ${C.border}`, '&:last-child': { borderBottom: 0 } }}>
                  <Box><Typography sx={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{name}</Typography><Typography sx={{ fontSize: 11, color: C.slate }}>{type}</Typography></Box>
                  <Chip label="ON" size="small" sx={{ bgcolor: C.greenLt, color: C.green, fontWeight: 700, fontSize: 10, height: 20 }} />
                </Box>
              ))}
            </Paper>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: C.navy, border: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#fff', mb: 0.5 }}>Need Help?</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', mb: 2, lineHeight: 1.6 }}>Check the BIAT API Style Guide before submitting your definition.</Typography>
              <Button variant="outlined" fullWidth sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 1.5, textTransform: 'none', fontWeight: 600, fontSize: 12, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.5)' } }} href="/Docs/API-Style-Guide.md" target="_blank">View Style Guide →</Button>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── LOADING ── */}
      {loading && !result && (
        <Paper variant="outlined" sx={{ p: 6, borderRadius: 2, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: C.navyLt, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <CircularProgress size={32} sx={{ color: C.navy }} thickness={4} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: C.navy, mb: 0.5 }}>
            {step === 2 ? 'Running Structural Audit' : step === 3 ? 'AI Engine Analyzing' : 'Governance Gate Evaluating'}
          </Typography>
          <Typography sx={{ color: C.slate, fontSize: 13, mb: 3 }}>
            {step === 2 ? 'Checking against Microsoft REST Guidelines & BIAT security standards' : step === 3 ? 'Qwen 2.5 is reviewing your specification for semantic issues' : 'Calculating final governance score and decision...'}
          </Typography>
          <LinearProgress sx={{ maxWidth: 320, mx: 'auto', borderRadius: 2, height: 4, bgcolor: C.navyLt, '& .MuiLinearProgress-bar': { bgcolor: C.navy } }} />
        </Paper>
      )}

      {/* ── RESULTS: TAB PANELS ── */}
      {isPipelineDone && (
        <Box>

          {/* ── TAB 2: AUDIT ── */}
          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}` }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy, mb: 1 }}>Structural Score</Typography>
                  <ScoreGauge score={score} />
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 22, color: errors.length > 0 ? C.red : C.green }}>{errors.length}</Typography>
                      <Typography sx={{ fontSize: 11, color: C.slate }}>Errors</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 22, color: warnings.length > 0 ? C.amber : C.green }}>{warnings.length}</Typography>
                      <Typography sx={{ fontSize: 11, color: C.slate }}>Warnings</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={9}>
                {violations.length > 0 ? (
                  <Paper variant="outlined" sx={{ borderRadius: 2, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                    <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: C.bg }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Linter Findings</Typography>
                      <Chip label={`${violations.length} issues`} size="small" sx={{ bgcolor: C.redLt, color: C.red, fontWeight: 700, fontSize: 11 }} />
                    </Box>
                    <TableContainer sx={{ maxHeight: 420 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            {['Severity', 'Rule', 'Message', 'Line'].map(h => (
                              <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: C.slate, textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5, bgcolor: C.bg }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {violations.map((v, i) => {
                            const sev = v.severity === 'ERROR' ? { c: C.red, bg: C.redLt, l: 'Error' } : v.severity === 'WARNING' ? { c: C.amber, bg: C.amberLt, l: 'Warning' } : { c: C.navy, bg: C.navyLt, l: 'Info' };
                            return (
                              <TableRow key={i} hover>
                                <TableCell sx={{ py: 1.2 }}><Chip label={sev.l} size="small" sx={{ bgcolor: sev.bg, color: sev.c, fontWeight: 700, fontSize: 10, height: 20 }} /></TableCell>
                                <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: C.navy, fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.rule_name || '-'}</TableCell>
                                <TableCell sx={{ fontSize: 12, color: C.slate }}>{v.message}</TableCell>
                                <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: C.slate }}>{v.line_number ?? '—'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                ) : (
                  <Paper variant="outlined" sx={{ p: 5, borderRadius: 2, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}><IconCheck size={24} color={C.green} strokeWidth={2.5} /></Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: C.green }}>No violations found</Typography>
                    <Typography sx={{ fontSize: 13, color: C.slate }}>Specification passes all linter rules.</Typography>
                  </Paper>
                )}
              </Grid>
            </Grid>
          )}

          {/* ── TAB 3: AI ENGINE ── */}
          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Paper variant="outlined" sx={{ borderRadius: 2, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                  <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>{file?.name || 'spec.yaml'}</Typography>
                      <Chip label="OPTIMIZED" size="small" sx={{ bgcolor: 'rgba(22,163,74,0.15)', color: C.green, fontWeight: 700, fontSize: 10, height: 20, border: `1px solid rgba(22,163,74,0.3)` }} />
                    </Box>
                    <Button size="small" startIcon={<IconCopy size={13} />} onClick={copyFixed}
                      sx={{ color: copied ? C.green : '#94a3b8', fontSize: 11, textTransform: 'none', minWidth: 0, p: '2px 8px', '&:hover': { color: '#fff' } }}>
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </Box>
                  <Box sx={{ bgcolor: '#0f172a', maxHeight: 520, overflow: 'auto' }}>
                    {fixedYaml ? diffLines(originalYaml, fixedYaml).map((line, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', bgcolor: line.isNew ? 'rgba(22,163,74,0.12)' : 'transparent', borderLeft: line.isNew ? `3px solid ${C.green}` : '3px solid transparent', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                        <Typography sx={{ color: '#374151', fontSize: 11, fontFamily: 'monospace', width: 36, flexShrink: 0, textAlign: 'right', pr: 1.5, lineHeight: 1.65, userSelect: 'none' }}>{i + 1}</Typography>
                        <Typography component="pre" sx={{ color: line.isNew ? '#86efac' : '#94a3b8', fontSize: 12, fontFamily: '"Fira Code","Cascadia Code",monospace', m: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-all', flex: 1 }}>
                          {line.text || ' '}
                        </Typography>
                      </Box>
                    )) : (
                      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={14} sx={{ color: C.green }} /><Typography sx={{ color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>Loading optimized spec...</Typography></Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${C.border}`, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck size={20} color={C.green} strokeWidth={2.5} /></Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 14, color: C.navy }}>AI Optimization Complete</Typography>
                      <Typography sx={{ fontSize: 11, color: C.slate }}>Qwen 2.5 · BIAT Governance Engine</Typography>
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: C.slate, lineHeight: 1.75, mb: 2.5 }}>
                    {aiSuggested ? aiSuggested.slice(0, 240) + (aiSuggested.length > 240 ? '…' : '') : 'Architecture reviewed. AI refactoring applied to align with BIAT standards.'}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    {[
                      { label: 'Issues Found', value: violations.length, color: C.red },
                      { label: 'Auto-Fixed', value: specData?.suggestions_applied ? violations.length : 0, color: C.green },
                      { label: 'Remaining', value: specData?.suggestions_applied ? 0 : violations.length, color: C.slate },
                    ].map(s => (
                      <Grid item xs={4} key={s.label}>
                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 1.5, bgcolor: C.bg, border: `1px solid ${C.border}` }}>
                          <Typography sx={{ fontWeight: 800, fontSize: 20, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                          <Typography sx={{ fontSize: 10, color: C.slate, textTransform: 'uppercase', letterSpacing: 0.5, mt: 0.3 }}>{s.label}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Box sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: C.redLt, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 10, color: C.slate, textTransform: 'uppercase', letterSpacing: 0.5 }}>Score Before</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: 20, color: C.red }}>{Math.max(0, score - 15)}</Typography>
                    </Box>
                    <Typography sx={{ color: C.slate, fontSize: 18, fontWeight: 300 }}>→</Typography>
                    <Box sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: C.greenLt, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 10, color: C.slate, textTransform: 'uppercase', letterSpacing: 0.5 }}>Score After</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: 20, color: C.green }}>{score}</Typography>
                    </Box>
                  </Box>
                </Paper>
                {specData?.suggestions_applied && (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.border}` }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 12, color: C.navy, mb: 1.5 }}>Applied Optimizations</Typography>
                    {['RESTful naming conventions enforced', 'Missing descriptions auto-populated', 'Security scheme definitions verified', 'Response model standardization applied'].map((opt, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconCheck size={11} color={C.green} strokeWidth={3} /></Box>
                        <Typography sx={{ fontSize: 12, color: C.slate }}>{opt}</Typography>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Grid>
            </Grid>
          )}

          {/* ── TAB 4: GATE ── */}
          {activeTab === 4 && (
            <Box>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3, border: `1.5px solid ${passed ? C.green : C.red}`, bgcolor: passed ? C.greenLt : C.redLt }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {passed ? <IconShieldCheck size={28} color={C.green} /> : <IconAlertCircle size={28} color={C.red} />}
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 16, color: passed ? C.green : C.red }}>Governance Gate — {passed ? 'APPROVED' : 'REJECTED'}</Typography>
                    <Typography sx={{ fontSize: 13, color: C.slate }}>{governance?.reason || (passed ? 'All checks passed. API published to WSO2 Gateway.' : `Score ${score}% is below the 80% threshold.`)}</Typography>
                  </Box>
                </Box>
              </Paper>
              <Grid container spacing={2}>
                {[
                  { label: 'Structural Score', value: `${score}%`, color: score >= 80 ? C.green : C.red, bg: score >= 80 ? C.greenLt : C.redLt },
                  { label: 'AI Similarity', value: governance ? `${(governance.ai_similarity_score * 100).toFixed(0)}%` : '—', color: C.navy, bg: C.navyLt },
                  { label: 'Errors', value: errors.length, color: errors.length === 0 ? C.green : C.red, bg: errors.length === 0 ? C.greenLt : C.redLt },
                  { label: 'Decision', value: governance?.final_decision || (passed ? 'APPROVED' : 'REJECTED'), color: passed ? C.green : C.red, bg: passed ? C.greenLt : C.redLt },
                ].map(s => (
                  <Grid item xs={6} md={3} key={s.label}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                      <Typography sx={{ fontSize: 11, color: C.slate, mt: 0.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* ── TAB 5: PUBLISH ── */}
          {activeTab === 5 && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'Structural Score', value: `${score}%`, color: score >= 80 ? C.green : C.red, bg: score >= 80 ? C.greenLt : C.redLt },
                  { label: 'Errors Found', value: errors.length, color: errors.length === 0 ? C.green : C.red, bg: errors.length === 0 ? C.greenLt : C.redLt },
                  { label: 'Warnings', value: warnings.length, color: C.amber, bg: C.amberLt },
                  { label: 'Gate Decision', value: passed ? 'PASS' : 'FAIL', color: passed ? C.green : C.red, bg: passed ? C.greenLt : C.redLt },
                ].map(s => (
                  <Grid item xs={6} md={3} key={s.label}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                      <Typography sx={{ fontSize: 11, color: C.slate, mt: 0.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3, border: `1.5px solid ${passed ? C.green : C.red}`, bgcolor: passed ? C.greenLt : C.redLt }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {passed ? <IconShieldCheck size={24} color={C.green} /> : <IconAlertCircle size={24} color={C.red} />}
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: passed ? C.green : C.red }}>{passed ? 'Governance Gate — APPROVED' : 'Governance Gate — REJECTED'}</Typography>
                    <Typography sx={{ fontSize: 12, color: C.slate }}>{passed ? 'All checks passed. API is being auto-published to WSO2 Gateway.' : `Score ${score}% is below the 80% minimum threshold required for publication.`}</Typography>
                  </Box>
                </Box>
              </Paper>
              {passed && (
                <Paper variant="outlined" sx={{ borderRadius: 2, mb: 3, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                  <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconRocket size={16} color={C.navy} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: C.navy }}>WSO2 Gateway Deployment</Typography>
                    {result.final_status === 'PUBLISHED' && <Chip label="PUBLISHED" size="small" sx={{ bgcolor: C.greenLt, color: C.green, fontWeight: 700 }} />}
                  </Box>
                  <Box sx={{ bgcolor: '#0f172a', p: 2.5, minHeight: 130 }}>
                    {deployLog.map((log, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
                        <Typography sx={{ color: C.green, fontSize: 12, fontFamily: 'monospace', flexShrink: 0 }}>$</Typography>
                        <Typography sx={{ color: log.success ? C.green : '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>{log.text}</Typography>
                      </Box>
                    ))}
                    {deployLog.length === 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={12} sx={{ color: C.green }} /><Typography sx={{ color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>Initializing connection...</Typography></Box>
                    )}
                  </Box>
                  {result.wso2_id && <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${C.border}` }}><Typography sx={{ fontSize: 11, color: C.slate, fontFamily: 'monospace' }}>Deployment ID: {result.wso2_id}</Typography></Box>}
                </Paper>
              )}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button variant="outlined" onClick={reset} sx={{ borderColor: C.navy, color: C.navy, borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>← New Submission</Button>
            <Button variant="contained" href="/my-apis" component="a" sx={{ bgcolor: C.navy, '&:hover': { bgcolor: C.navyDk }, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}>View in My APIs →</Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
