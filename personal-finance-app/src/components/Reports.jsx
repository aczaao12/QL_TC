import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Box, Typography, Paper, CircularProgress, Grid, Divider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useSettings } from '../contexts/SettingsContext';

function Reports({ userId, showSnackbar }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all', 'current', 'last', or a specific month string
  const { formatAmount } = useSettings();

  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    let queryRef = collection(db, 'transactions');
    queryRef = query(queryRef, where('userId', '==', userId));

    let startFilterDate = null;
    let endFilterDate = null;

    if (selectedMonth === 'current') {
      startFilterDate = dayjs().startOf('month').toDate();
      endFilterDate = dayjs().endOf('month').toDate();
    } else if (selectedMonth === 'last') {
      startFilterDate = dayjs().subtract(1, 'month').startOf('month').toDate();
      endFilterDate = dayjs().subtract(1, 'month').endOf('month').toDate();
    } else if (startDate && endDate) {
      startFilterDate = startDate.startOf('day').toDate();
      endFilterDate = endDate.endOf('day').toDate();
    }

    if (startFilterDate) {
      queryRef = query(queryRef, where('timestamp', '>=', startFilterDate));
    }
    if (endFilterDate) {
      queryRef = query(queryRef, where('timestamp', '<=', endFilterDate));
    }

    const unsubscribe = onSnapshot(queryRef, (querySnapshot) => {
      const transactionsData = [];
      querySnapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(transactionsData);
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
      showSnackbar(`Error fetching transactions for reports: ${err.message}`, 'error');
      console.error('Error fetching transactions for reports: ', err);
    });

    return () => unsubscribe();
  }, [userId, showSnackbar, startDate, endDate, selectedMonth]);

  if (loading) {
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

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpense;

  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const incomeByCategory = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom>Financial Reports</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="month-filter-label">Filter by Month</InputLabel>
          <Select
            labelId="month-filter-label"
            value={selectedMonth}
            label="Filter by Month"
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setStartDate(null);
              setEndDate(null);
            }}
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="current">Current Month</MenuItem>
            <MenuItem value="last">Last Month</MenuItem>
          </Select>
        </FormControl>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(newValue) => {
              setStartDate(newValue);
              setSelectedMonth('custom');
            }}
            renderInput={(params) => <TextField {...params} />}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(newValue) => {
              setEndDate(newValue);
              setSelectedMonth('custom');
            }}
            renderInput={(params) => <TextField {...params} />}
          />
        </LocalizationProvider>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Summary</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1">Total Income: {formatAmount(totalIncome)}</Typography>
            <Typography variant="body1">Total Expense: {formatAmount(totalExpense)}</Typography>
            <Typography variant="body1">Net Savings: {formatAmount(netSavings)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Expenses by Category</Typography>
            <Divider sx={{ mb: 2 }} />
            {Object.entries(expensesByCategory).length > 0 ? (
              Object.entries(expensesByCategory).map(([category, amount]) => (
                <Typography key={category} variant="body1">{category}: {formatAmount(amount)}</Typography>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">No expenses to report.</Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>Income by Category</Typography>
            <Divider sx={{ mb: 2 }} />
            {Object.entries(incomeByCategory).length > 0 ? (
              Object.entries(incomeByCategory).map(([category, amount]) => (
                <Typography key={category} variant="body1">{category}: {formatAmount(amount)}</Typography>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">No income to report.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Reports;
