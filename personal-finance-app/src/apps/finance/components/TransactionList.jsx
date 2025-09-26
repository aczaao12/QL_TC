import React, { useEffect, useState } from 'react';
import { db } from '../../../services/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Box, Typography, List, ListItem, ListItemText, Paper, CircularProgress, IconButton, FormControl, InputLabel, Select, MenuItem, ListItemIcon } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { setItem, getItem } from '../../../services/indexedDB';
import { useSettings } from '../../../shared/contexts/SettingsContext';

function TransactionList({ userId, showSnackbar, onEdit }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const { formatAmount } = useSettings();

  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const indexedDBKey = `transactions_${userId}`;

    // Try to load from IndexedDB first
    getItem(indexedDBKey).then(cachedTransactions => {
      if (cachedTransactions) {
        setTransactions(cachedTransactions);
        setLoading(false);
      }
    });

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      ...(filterType !== 'all' ? [where('type', '==', filterType)] : []),
      orderBy(sortBy, sortOrder)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const transactionsData = [];
      querySnapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(transactionsData);
      setLoading(false);
      setItem(indexedDBKey, transactionsData); // Store in IndexedDB
    }, (err) => {
      setError(err.message);
      setLoading(false);
      console.error('Error fetching transactions: ', err);
    });

    return () => unsubscribe();
  }, [userId, filterType, sortBy, sortOrder]);

  if (loading && transactions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ mt: 5, textAlign: 'center' }}>
        Error: {error}
      </Typography>
    );
  }

  if (transactions.length === 0) {
    return (
      <Typography variant="h6" sx={{ mt: 5, textAlign: 'center' }}>
        No transactions yet. Add some!
      </Typography>
    );
  }

  const formatTimestampToDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Check if it's a Firebase Timestamp object
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    // Assume it's already a Date object or a string parsable by Date constructor
    try {
      return new Date(timestamp).toLocaleDateString();
    } catch (e) {
      console.error("Error parsing timestamp:", timestamp, e);
      return 'Invalid Date';
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, margin: 'auto', mt: 5 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Your Transactions
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="filter-type-label">Type</InputLabel>
          <Select
            labelId="filter-type-label"
            value={filterType}
            label="Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="income">Income</MenuItem>
            <MenuItem value="expense">Expense</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="sort-by-label">Sort By</InputLabel>
          <Select
            labelId="sort-by-label"
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="timestamp">Date</MenuItem>
            <MenuItem value="amount">Amount</MenuItem>
            <MenuItem value="description">Description</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="sort-order-label">Order</InputLabel>
          <Select
            labelId="sort-order-label"
            value={sortOrder}
            label="Order"
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <MenuItem value="desc">Descending</MenuItem>
            <MenuItem value="asc">Ascending</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <List>
        {transactions.map((transaction) => (
          <ListItem key={transaction.id} divider secondaryAction={
            <IconButton edge="end" aria-label="edit" onClick={() => onEdit(transaction)}>
              <EditIcon />
            </IconButton>
          }>
            <ListItemIcon>
              {transaction.type === 'income' ? <ArrowUpwardIcon color="success" /> : <ArrowDownwardIcon color="error" />}
            </ListItemIcon>
            <ListItemText
              primary={`${transaction.description} (${transaction.category})`}
              secondary={`Amount: ${formatAmount(transaction.amount)} - Type: ${transaction.type} - Date: ${formatTimestampToDate(transaction.timestamp)}`}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export default TransactionList;