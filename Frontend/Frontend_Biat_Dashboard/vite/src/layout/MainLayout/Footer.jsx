import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function Footer() {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 3, mt: 'auto' }}>
      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
        &copy; {new Date().getFullYear()} BIAT — Innovation &amp; Technology
      </Typography>
      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
        API Governance Platform v1.0
      </Typography>
    </Stack>
  );
}
