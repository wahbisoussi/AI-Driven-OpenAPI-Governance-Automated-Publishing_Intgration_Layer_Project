// material-ui
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// ==============================|| FOOTER - AUTHENTICATION 2 & 3 ||============================== //

export default function AuthFooter() {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
        BIAT Innovation &amp; Technology
      </Typography>
      <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
        &copy; {new Date().getFullYear()} Integration Layer
      </Typography>
    </Stack>
  );
}
