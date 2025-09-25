import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Paper, Typography, MenuItem } from '@mui/material';
import AmountInput from './AmountInput';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { removeItem } from '../indexedDB';

function BudgetForm({ userId, showSnackbar }) {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'categories'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const categoriesData = [];
      querySnapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() });
      });
      setCategories(categoriesData);
    }, (err) => {
      console.error('Error fetching categories for budget form: ', err);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!userId) {
      showSnackbar('User not logged in.', 'error');
      return;
    }

    if (!category || !amount) {
      showSnackbar('Please fill in all fields.', 'warning');
      return;
    }

    try {
      await addDoc(collection(db, 'budgets'), {
        userId,
        category,
        amount: parseFloat(amount),
        createdAt: serverTimestamp(),
      });
      showSnackbar('Budget added successfully!', 'success');
      setCategory('');
      setAmount('');
      // Invalidate IndexedDB cache for budgets
      await removeItem(`budgets_${userId}`);
    } catch (err) {
      setError(err.message);
      showSnackbar(`Error adding budget: ${err.message}`, 'error');
      console.error('Error adding budget: ', err);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, margin: 'auto', mt: 5 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Set New Budget
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          select
          label="Category"
          fullWidth
          margin="normal"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.name}>
              {cat.name} ({cat.type})
            </MenuItem>
          ))}
        </TextField>
        <AmountInput
          label="Budget Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
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
          Set Budget
        </Button>
      </form>
    </Paper>
  );
}

export default BudgetForm;
