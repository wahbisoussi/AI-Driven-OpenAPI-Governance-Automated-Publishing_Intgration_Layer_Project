import { Box, Typography, Paper, Divider } from '@mui/material';
import { IconSettings } from '@tabler/icons-react';

export default function Settings() {
  return (
    <Box>
      <Typography variant="h3" sx={{ color: '#1e3a5f', fontWeight: 700, mb: 0.5 }}>Settings</Typography>
      <Typography sx={{ color: '#64748b', mb: 3 }}>Platform configuration and preferences.</Typography>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconSettings size={20} color="#1e3a5f" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Backend Configuration</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {[
          { label: 'API Backend URL', value: 'http://localhost:8000' },
          { label: 'WSO2 Publisher URL', value: 'https://localhost:9443/publisher' },
          { label: 'AI Engine', value: 'Ollama + Qwen 2.5 (1.5b)' },
          { label: 'Vector DB', value: 'PostgreSQL + PGVector' },
          { label: 'Governance Threshold', value: '80% structural score, 0 errors' }
        ].map(item => (
          <Box key={item.label} sx={{ display: 'flex', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
            <Typography sx={{ fontSize: 13, color: '#64748b', width: 220 }}>{item.label}</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: '#1e3a5f' }}>{item.value}</Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
