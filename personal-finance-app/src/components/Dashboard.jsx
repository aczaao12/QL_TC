import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { Box, Typography, Paper, CircularProgress, Grid, List, ListItem, ListItemText, Divider, Button, TextField } from '@mui/material';
import AmountInput from './AmountInput';
import { useSettings } from '../contexts/SettingsContext';
import { Link } from 'react-router-dom';

function Dashboard({ userId, showSnackbar }) {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categorySummary, setCategorySummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialBalance, setInitialBalance] = useState(0);
  const [newInitialBalance, setNewInitialBalance] = useState('');
  const { formatAmount } = useSettings();

  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      setBudgets([]);
      setCategorySummary({});
      setLoading(false);
      return;
    }

    const userSettingsRef = doc(db, 'userSettings', userId);
    const unsubscribeUserSettings = onSnapshot(userSettingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setInitialBalance(docSnap.data().initialBalance || 0);
      }
    });

    const qTransactions = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeTransactions = onSnapshot(qTransactions, (querySnapshot) => {
      const transactionsData = [];
      const summary = {};
      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        transactionsData.push(data);

        if (!summary[data.category]) {
          summary[data.category] = { expense: 0, income: 0 };
        }
        summary[data.category][data.type] += data.amount;
      });
      setTransactions(transactionsData);
      setCategorySummary(summary);
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
      showSnackbar(`Error fetching transactions: ${err.message}`, 'error');
      console.error('Error fetching transactions for dashboard: ', err);
    });

    const qBudgets = query(
      collection(db, 'budgets'),
      where('userId', '==', userId)
    );

    const unsubscribeBudgets = onSnapshot(qBudgets, (querySnapshot) => {
      const budgetsData = [];
      querySnapshot.forEach((doc) => {
        budgetsData.push({ id: doc.id, ...doc.data() });
      });
      setBudgets(budgetsData);
    }, (err) => {
      showSnackbar(`Error fetching budgets: ${err.message}`, 'error');
      console.error('Error fetching budgets for dashboard: ', err);
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeBudgets();
      unsubscribeUserSettings();
    };
  }, [userId, showSnackbar]);

  const handleSetInitialBalance = async () => {
    if (newInitialBalance === '' || isNaN(parseFloat(newInitialBalance))) {
      showSnackbar('Please enter a valid number for the initial balance.', 'warning');
      return;
    }
    try {
      const userSettingsRef = doc(db, 'userSettings', userId);
      await setDoc(userSettingsRef, { initialBalance: parseFloat(newInitialBalance) }, { merge: true });
      showSnackbar('Initial balance set successfully!', 'success');
      setNewInitialBalance('');
    } catch (err) {
      showSnackbar(`Error setting initial balance: ${err.message}`, 'error');
      console.error('Error setting initial balance: ', err);
    }
  };

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

  const netBalance = initialBalance + totalIncome - totalExpense;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom>Dashboard Overview</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">Current Balance</Typography>
            <Typography variant="h4" color={netBalance >= 0 ? 'primary' : 'error'}>
              {formatAmount(netBalance)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">Total Income</Typography>
            <Typography variant="h4" color="success.main">
              {formatAmount(totalIncome)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">Total Expense</Typography>
            <Typography variant="h4" color="error.main">
              {formatAmount(totalExpense)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Set Initial Balance</Typography>
            <AmountInput
              label="Initial Balance"
              value={newInitialBalance}
              onChange={(e) => setNewInitialBalance(e.target.value)}
            />
            <Button onClick={handleSetInitialBalance} variant="contained" sx={{ mt: 1 }}>
              Set Balance
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Spending by Category</Typography>
            <Divider sx={{ mb: 2 }} />
            {Object.keys(categorySummary).length > 0 ? (
              <List>
                {Object.entries(categorySummary).map(([categoryName, totals]) => (
                  <ListItem key={categoryName} divider>
                    <ListItemText
                      primary={categoryName}
                      secondary={`Expense: ${formatAmount(totals.expense)} | Income: ${formatAmount(totals.income)}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>No category data available.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Recent Transactions</Typography>
            <Divider sx={{ mb: 2 }} />
            {transactions.length > 0 ? (
              <List>
                {transactions.slice(0, 5).map((transaction) => (
                  <ListItem key={transaction.id} divider>
                    <ListItemText
                      primary={`${transaction.description} (${transaction.category})`}
                      secondary={`Amount: ${transaction.amount} - Type: ${transaction.type} - Date: ${new Date(transaction.timestamp?.toDate()).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>No recent transactions.</Typography>
            )}
            <Button component={Link} to="/transactions" variant="outlined" sx={{ mt: 2 }}>
              View All Transactions
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Active Budgets</Typography>
            <Divider sx={{ mb: 2 }} />
            {budgets.length > 0 ? (
              <List>
                {budgets.map((budget) => (
                  <ListItem key={budget.id} divider>
                    <ListItemText
                      primary={`${budget.category}: ${formatAmount(budget.amount)}`}
                      secondary={`Set on: ${new Date(budget.createdAt?.toDate()).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>No active budgets.</Typography>
            )}
            <Button component={Link} to="/budgets" variant="outlined" sx={{ mt: 2 }}>
              View All Budgets
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
