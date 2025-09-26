import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import CategoryForm from './CategoryForm';
import CategoryList from './CategoryList';

function Categories({ userId, showSnackbar }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom>Categories</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <CategoryForm userId={userId} showSnackbar={showSnackbar} />
        </Grid>
        <Grid item xs={12} md={7}>
          <CategoryList userId={userId} showSnackbar={showSnackbar} />
        </Grid>
      </Grid>
    </Box>
  );
}

export default Categories;
