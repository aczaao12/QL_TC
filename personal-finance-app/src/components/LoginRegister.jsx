import React from 'react';
import { Box } from '@mui/material';
import Auth from './Auth';

function LoginRegister({ showSnackbar }) {
  return (
    <Box>
      <Auth showSnackbar={showSnackbar} />
    </Box>
  );
}

export default LoginRegister;