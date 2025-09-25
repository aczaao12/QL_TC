import React, { useState } from 'react';
import { TextField, Button, Box, Paper, Typography, MenuItem } from '@mui/material';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { removeItem } from '../indexedDB';

function CategoryForm({ userId, showSnackbar }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('expense'); // 'expense' or 'income'
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!userId) {
      showSnackbar('User not logged in.', 'error');
      return;
    }

    if (!name) {
      showSnackbar('Category name cannot be empty.', 'warning');
      return;
    }

    try {
      await addDoc(collection(db, 'categories'), {
        userId,
        name,
        type,
        createdAt: serverTimestamp(),
      });
      showSnackbar('Category added successfully!', 'success');
      setName('');
      // Invalidate IndexedDB cache for categories
      await removeItem(`categories_${userId}`);
    } catch (err) {
      setError(err.message);
      showSnackbar(`Error adding category: ${err.message}`, 'error');
      console.error('Error adding category: ', err);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, margin: 'auto', mt: 5 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Add New Category
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Category Name"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextField
          select
          label="Type"
          fullWidth
          margin="normal"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <MenuItem value="expense">Expense</MenuItem>
          <MenuItem value="income">Income</MenuItem>
        </TextField>
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Add Category
        </Button>
      </form>
    </Paper>
  );
}

export default CategoryForm;
