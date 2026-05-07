import { useState, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, LinearProgress, Paper, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, CircularProgress, Divider, Grid
} from '@mui/material';
import {
  IconCloudUpload, IconCheck, IconX, IconAlertTriangle,
  IconBrain, IconShieldCheck, IconRocket, IconFileUpload
} from '@tabler/icons-react';
import axios from 'axios';

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
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 0 }}>
      {STEPS.map((step, idx) => {
        const done = current > step.id;
        const active = current === step.id;
        return (
          <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : 'none' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: done ? '#1e3a5f' : active ? '#1e3a5f' : '#e2e8f0',
                color: done || active ? '#fff' : '#94a3b8',
                fontWeight: 700, fontSize: 14, border: active ? '2px solid #1e3a5f' : 'none'
              }}>
                {done ? <IconCheck size={16} /> : step.id}
              </Box>
              <Typography sx={{ fontSize: 11, mt: 0.5, color: active ? '#1e3a5f' : '#94a3b8', fontWeight: active ? 700 : 400 }}>
                {step.label}
              </Typography>
            </Box>
            {idx < STEPS.length - 1 && (
              <Box sx={{ flex: 1, height: 2, bgcolor: done ? '#1e3a5f' : '#e2e8f0', mx: 1, mb: 2 }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function ScoreGauge({ score, size = 120 }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f97316' : '#ef4444';
  const radius = (size / 2) - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }} strokeLinecap="round" />
      </svg>
      <Box sx={{ textAlign: 'center', zIndex: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: size / 5, color, lineHeight: 1 }}>{score}%</Typography>
        <Typography sx={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Score</Typography>
      </Box>
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
      <Typography variant="h3" sx={{ mb: 0.5, color: '#1e3a5f', fontWeight: 700 }}>New API Pipeline</Typography>
      <Typography sx={{ color: '#64748b', mb: 3 }}>Upload your OpenAPI specification to begin the governance audit.</Typography>

      <StepBar current={step} />

      {/* ── STEP 1: UPLOAD ── */}
      {step === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>Import API Definition</Typography>
              <Typography sx={{ color: '#64748b', mb: 2, fontSize: 13 }}>
                Upload your OpenAPI (Swagger) JSON or YAML file to begin the governance audit.
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <Box
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => inputRef.current.click()}
                sx={{
                  border: `2px dashed ${dragging ? '#1e3a5f' : file ? '#22c55e' : '#cbd5e1'}`,
                  borderRadius: 3, p: 5, textAlign: 'center', cursor: 'pointer',
                  bgcolor: dragging ? '#f0f4ff' : file ? '#f0fdf4' : '#f8fafc',
                  transition: 'all 0.2s', mb: 2
                }}>
                <input ref={inputRef} type="file" accept=".yaml,.yml,.json" hidden onChange={e => setFile(e.target.files[0])} />
                {file ? (
                  <>
                    <IconCheck size={40} color="#22c55e" />
                    <Typography sx={{ mt: 1, fontWeight: 600, color: '#22c55e' }}>{file.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#64748b' }}>{(file.size / 1024).toFixed(1)} KB · Click to change</Typography>
                  </>
                ) : (
                  <>
                    <IconCloudUpload size={40} color="#94a3b8" />
                    <Typography sx={{ mt: 1, fontWeight: 600, color: '#475569' }}>Drag and drop file here</Typography>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Limit 20MB per file · JSON or YAML</Typography>
                  </>
                )}
              </Box>

              <Button
                fullWidth variant="contained"
                disabled={!file}
                onClick={handleSubmit}
                startIcon={<IconFileUpload size={18} />}
                sx={{ bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#162d4a' }, py: 1.5, borderRadius: 2, fontWeight: 600 }}>
                Run Governance Pipeline
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IconShieldCheck size={20} color="#1e3a5f" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Ruleset Active</Typography>
              </Box>
              {['Microsoft REST Guidelines', 'Spectral OAS Linter', 'BIAT Security Rules', 'Documentation Rules'].map(r => (
                <Box key={r} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography sx={{ fontSize: 13 }}>{r}</Typography>
                  <Chip label="ON" size="small" sx={{ bgcolor: '#1e3a5f', color: '#fff', fontSize: 10, height: 20 }} />
                </Box>
              ))}
            </Paper>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#1e3a5f', color: '#fff' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Need Help?</Typography>
              <Typography sx={{ fontSize: 13, opacity: 0.85, mb: 2 }}>
                Check the BIAT API style guide before importing your definition.
              </Typography>
              <Button variant="outlined" fullWidth sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', borderRadius: 2 }}
                href="/Docs/API-Style-Guide.md" target="_blank">
                View Style Guide
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── STEPS 2-4: LOADING ── */}
      {loading && (
        <Paper sx={{ p: 5, borderRadius: 3, textAlign: 'center' }}>
          <CircularProgress size={50} sx={{ color: '#1e3a5f', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e3a5f' }}>
            {step === 2 && 'Running Structural Audit...'}
            {step === 3 && 'AI Engine Analyzing...'}
            {step === 4 && 'Governance Gate Evaluating...'}
          </Typography>
          <Typography sx={{ color: '#64748b', mt: 1 }}>
            {step === 2 && 'Checking against Microsoft REST Guidelines & BIAT standards'}
            {step === 3 && 'Qwen 2.5 is reviewing your API for semantic issues'}
            {step === 4 && 'Calculating final governance score...'}
          </Typography>
          <LinearProgress sx={{ mt: 3, borderRadius: 2, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#1e3a5f' } }} />
        </Paper>
      )}

      {/* ── STEP 5: RESULTS ── */}
      {result && step === 5 && (
        <Box>
          {/* Audit Summary */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
                <ScoreGauge score={score} size={140} />
                <Typography variant="h6" sx={{ mt: 1.5, fontWeight: 700, color: score >= 80 ? '#22c55e' : '#ef4444' }}>
                  {score >= 80 ? 'Excellent Structural Integrity' : 'Needs Improvement'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1.5 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: '#ef4444', fontSize: 20 }}>{errors.length}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#64748b' }}>Errors</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: '#f97316', fontSize: 20 }}>{warnings.length}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#64748b' }}>Warnings</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={8}>
              {/* Governance Gate */}
              <Paper sx={{ p: 3, borderRadius: 3, mb: 2, border: `2px solid ${passed ? '#22c55e' : '#ef4444'}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  {passed
                    ? <IconShieldCheck size={28} color="#22c55e" />
                    : <IconX size={28} color="#ef4444" />}
                  <Typography variant="h5" sx={{ fontWeight: 700, color: passed ? '#22c55e' : '#ef4444' }}>
                    {passed ? 'STATUS: PASS — Gate Cleared' : 'STATUS: FAIL — Governance Rejected'}
                  </Typography>
                </Box>
                <Typography sx={{ color: '#64748b', fontSize: 13 }}>
                  {passed
                    ? 'This API has passed all mandatory governance checks. Auto-publishing to WSO2 Gateway...'
                    : `Score ${score}% is below the 80% threshold required for auto-approval.`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Structural Score', value: `${score}%`, pass: score >= 80 },
                    { label: 'AI Similarity', value: `${(aiSimilarity * 100).toFixed(1)}%`, pass: aiSimilarity < 0.85 },
                    { label: 'Critical Errors', value: errors.length, pass: errors.length === 0 }
                  ].map(item => (
                    <Box key={item.label} sx={{ flex: 1, minWidth: 100, p: 1.5, bgcolor: item.pass ? '#f0fdf4' : '#fef2f2', borderRadius: 2 }}>
                      <Typography sx={{ fontSize: 11, color: '#64748b' }}>{item.label}</Typography>
                      <Typography sx={{ fontWeight: 700, color: item.pass ? '#22c55e' : '#ef4444' }}>{item.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* AI Suggestions */}
              {aiSuggestions && (
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <IconBrain size={20} color="#7c3aed" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>AI Engine Suggestions</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                    {aiSuggestions.slice(0, 400)}{aiSuggestions.length > 400 ? '...' : ''}
                  </Typography>
                </Paper>
              )}
            </Grid>
          </Grid>

          {/* Violations Table */}
          {violations.length > 0 && (
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Spectral Linter Findings</Typography>
                <Chip label={`${violations.length} issues`} size="small" sx={{ bgcolor: '#fef2f2', color: '#ef4444' }} />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      {['Severity', 'Rule', 'Message', 'Path'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#374151' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {violations.slice(0, 20).map((v, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Chip label={severityLabel(v.severity)} size="small"
                            sx={{ bgcolor: severityColor(v.severity) + '20', color: severityColor(v.severity), fontSize: 10, fontWeight: 600 }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', color: '#374151' }}>{v.code || '-'}</TableCell>
                        <TableCell sx={{ fontSize: 12, maxWidth: 300 }}>{v.message}</TableCell>
                        <TableCell sx={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                          {Array.isArray(v.path) ? v.path.join(' › ') : v.path || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Refactored YAML */}
          {refactoredYaml && (
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <IconBrain size={18} color="#7c3aed" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>AI Optimized Specification</Typography>
                <Chip label="OPTIMIZED" size="small" sx={{ bgcolor: '#7c3aed', color: '#fff', fontSize: 10 }} />
              </Box>
              <Box sx={{ bgcolor: '#0f172a', borderRadius: 2, p: 2, maxHeight: 280, overflow: 'auto' }}>
                <pre style={{ margin: 0, color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {refactoredYaml.slice(0, 2000)}{refactoredYaml.length > 2000 ? '\n...' : ''}
                </pre>
              </Box>
            </Paper>
          )}

          {/* WSO2 Deploy Terminal */}
          {passed && (
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IconRocket size={20} color="#1e3a5f" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>WSO2 Gateway Deployment</Typography>
                {result.final_status === 'PUBLISHED' && (
                  <Chip label="PUBLISHED" size="small" sx={{ bgcolor: '#22c55e', color: '#fff', fontWeight: 700 }} />
                )}
              </Box>
              <Box sx={{ bgcolor: '#0f172a', borderRadius: 2, p: 2, minHeight: 120 }}>
                {deployLog.map((log, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography sx={{ color: '#22c55e', fontSize: 12, mr: 0.5 }}>→</Typography>
                    <Typography sx={{ color: log.success ? '#22c55e' : '#e2e8f0', fontSize: 12, fontFamily: 'monospace' }}>
                      {log.text}
                    </Typography>
                  </Box>
                ))}
                {deployLog.length === 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={14} sx={{ color: '#22c55e' }} />
                    <Typography sx={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>Initializing...</Typography>
                  </Box>
                )}
              </Box>
              {result.wso2_id && (
                <Typography sx={{ fontSize: 12, color: '#64748b', mt: 1 }}>
                  Deployment ID: {result.wso2_id}
                </Typography>
              )}
            </Paper>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={reset} sx={{ borderColor: '#1e3a5f', color: '#1e3a5f', borderRadius: 2 }}>
              Upload Another API
            </Button>
            <Button variant="contained" href="/my-apis" sx={{ bgcolor: '#1e3a5f', borderRadius: 2 }}>
              View in My APIs
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
