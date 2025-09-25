import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import BudgetForm from './BudgetForm';
import BudgetList from './BudgetList';

function Budgets({ userId, showSnackbar }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom>Budgets</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <BudgetForm userId={userId} showSnackbar={showSnackbar} />
        </Grid>
        <Grid item xs={12} md={7}>
          <BudgetList userId={userId} showSnackbar={showSnackbar} />
        </Grid>
      </Grid>
    </Box>
  );
}

export default Budgets;
