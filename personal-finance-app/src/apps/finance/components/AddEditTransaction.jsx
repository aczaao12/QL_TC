import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, MenuItem, Paper, Typography } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import AmountInput from './AmountInput';
import { db, app } from '../../../services/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
// import { getFunctions, httpsCallable } from 'firebase/functions';
import { removeItem } from '../../../services/indexedDB';
import { useParams } from 'react-router-dom';

function AddEditTransaction({ userId, showSnackbar, onTransactionSaved }) {
  const { transactionId } = useParams();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense'); // 'expense' or 'income'
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(dayjs()); // State for the date picker, default to today
  const [error, setError] = useState(null);
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);

  useEffect(() => {
    if (transactionId) {
      const fetchTransaction = async () => {
        const docRef = doc(db, 'transactions', transactionId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setCurrentTransaction(data);
          setAmount(data.amount.toString());
          setType(data.type);
          setCategory(data.category);
          setDescription(data.description);
          // Set date from fetched timestamp
          if (data.timestamp && data.timestamp.toDate) {
            setDate(dayjs(data.timestamp.toDate()));
          } else {
            setDate(dayjs()); // Default to today if no timestamp or invalid
          }
        } else {
          showSnackbar('Transaction not found!', 'error');
          // Optionally redirect to add new transaction or transaction list
        }
      };
      fetchTransaction();
    } else {
      setCurrentTransaction(null);
      setAmount('');
      setType('expense');
      setCategory('');
      setDescription('');
      setDate(dayjs()); // Reset date to today for new transaction
    }
  }, [transactionId, showSnackbar]);

  // const functions = getFunctions(app);
  // const suggestCategoryCallable = httpsCallable(functions, 'suggestCategory');

  // useEffect(() => {
  //   const timer = setTimeout(async () => {
  //     if (description.trim() !== '') {
  //       setIsSuggesting(true);
  //       try {
  //         const result = await suggestCategoryCallable({ description: description });
  //         setSuggestedCategory(result.data.category);
  //       } catch (err) {
  //         console.error("Error calling suggestCategory function:", err);
  //         setSuggestedCategory(''); // Clear suggestion on error
  //       } finally {
  //         setIsSuggesting(false);
  //       }
  //     } else {
  //       setSuggestedCategory(''); // Clear suggestion if description is empty
  //     }
  //   }, 500); // Debounce the suggestion call

  //   return () => clearTimeout(timer);
  // }, [description, suggestCategoryCallable]);

  const categories = {
    expense: ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Other'],
    income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
  };

  const handleDelete = async () => {
    if (!currentTransaction || !window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const transactionRef = doc(db, 'transactions', currentTransaction.id);
      await deleteDoc(transactionRef);
      showSnackbar('Transaction deleted successfully!', 'success');
      setAmount('');
      setCategory('');
      setDescription('');
      setDate(dayjs()); // Reset date
      onTransactionSaved(); // Clear editing state in parent
      // Invalidate IndexedDB cache for transactions and budgets
      await removeItem(`transactions_${userId}`);
      await removeItem(`transactions_for_budgets_${userId}`);
    } catch (err) {
      showSnackbar(`Error deleting transaction: ${err.message}`, 'error');
      console.error("Error deleting document: ", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!userId) {
      showSnackbar('User not logged in.', 'error');
      return;
    }

    if (!amount || !category || !description) {
      showSnackbar('Please fill in all fields.', 'warning');
      return;
    }

    // Convert dayjs object to Firebase Timestamp
    const transactionTimestamp = date ? Timestamp.fromDate(date.toDate()) : serverTimestamp();

    try {
      if (currentTransaction) {
        const transactionRef = doc(db, 'transactions', currentTransaction.id);
        await updateDoc(transactionRef, {
          amount: parseFloat(amount),
          type,
          category,
          description,
          timestamp: transactionTimestamp,
        });
        showSnackbar('Transaction updated successfully!', 'success');
      } else {
        await addDoc(collection(db, 'transactions'), {
          userId,
          amount: parseFloat(amount),
          type,
          category,
          description,
          timestamp: transactionTimestamp,
        });
        showSnackbar('Transaction added successfully!', 'success');
      }
      setAmount('');
      setCategory('');
      setDescription('');
      setDate(dayjs()); // Reset date to today
      onTransactionSaved(); // Clear editing state in parent
      // Invalidate IndexedDB cache for transactions and budgets (as transactions affect budgets)
      await removeItem(`transactions_${userId}`);
      await removeItem(`transactions_for_budgets_${userId}`);
    } catch (err) {
      setError(err.message);
      showSnackbar(`Error ${currentTransaction ? 'updating' : 'adding'} transaction: ${err.message}`, 'error');
      console.error(`Error ${currentTransaction ? 'updating' : 'adding'} document: `, err);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 500, margin: 'auto', mt: 5 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {currentTransaction ? 'Edit Transaction' : 'Add New Transaction'}
        </Typography>
        <form onSubmit={handleSubmit}>
          <AmountInput
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
          <TextField
            select
            label="Category"
            fullWidth
            margin="normal"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {categories[type].map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
          <DatePicker
            label="Date"
            value={date}
            onChange={(newValue) => setDate(newValue)}
            renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          {isSuggesting && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Suggesting category...
            </Typography>
          )}
          {suggestedCategory && !isSuggesting && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                Suggested Category: <strong>{suggestedCategory}</strong>
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setCategory(suggestedCategory)}
              >
                Accept
              </Button>
            </Box>
          )}
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
            {currentTransaction ? 'Update Transaction' : 'Add Transaction'}
          </Button>
          {currentTransaction && (
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button
                type="button"
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={onTransactionSaved}
              >
                Cancel Edit
              </Button>
              <Button
                type="button"
                variant="contained"
                color="error"
                fullWidth
                onClick={handleDelete}
              >
                Delete Transaction
              </Button>
            </Box>
          )}
        </form>
      </Paper>
    </LocalizationProvider>
  );
}

export default AddEditTransaction;
