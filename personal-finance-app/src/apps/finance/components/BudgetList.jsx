import React, { useEffect, useState } from 'react';
import { db } from '../../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Box, Typography, List, ListItem, ListItemText, Paper, CircularProgress, LinearProgress, ListItemIcon } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { setItem, getItem } from '../../../services/indexedDB';
import { useSettings } from '../../../shared/contexts/SettingsContext';

function BudgetList({ userId }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spending, setSpending] = useState({}); // To store spending per category
  const { formatAmount } = useSettings();

  useEffect(() => {
    if (!userId) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    const indexedDBBudgetsKey = `budgets_${userId}`;
    const indexedDBTransactionsKey = `transactions_for_budgets_${userId}`;

    // Try to load from IndexedDB first
    getItem(indexedDBBudgetsKey).then(cachedBudgets => {
      if (cachedBudgets) {
        setBudgets(cachedBudgets);
        setLoading(false);
      }
    });
    getItem(indexedDBTransactionsKey).then(cachedTransactions => {
      if (cachedTransactions) {
        const newSpending = {};
        cachedTransactions.forEach((transaction) => {
          if (transaction.type === 'expense') {
            if (newSpending[transaction.category]) {
              newSpending[transaction.category] += transaction.amount;
            } else {
              newSpending[transaction.category] = transaction.amount;
            }
          }
        });
        setSpending(newSpending);
      }
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
      setLoading(false);
      setItem(indexedDBBudgetsKey, budgetsData); // Store in IndexedDB
    }, (err) => {
      setError(err.message);
      setLoading(false);
      console.error('Error fetching budgets: ', err);
    });

    // Fetch spending for each category
    const qTransactions = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('type', '==', 'expense')
    );

    const unsubscribeTransactions = onSnapshot(qTransactions, (querySnapshot) => {
      const newSpending = {};
      const transactionsData = [];
      querySnapshot.forEach((doc) => {
        const transaction = doc.data();
        transactionsData.push({ id: doc.id, ...transaction });
        if (newSpending[transaction.category]) {
          newSpending[transaction.category] += transaction.amount;
        } else {
          newSpending[transaction.category] = transaction.amount;
        }
      });
      setSpending(newSpending);
      setItem(indexedDBTransactionsKey, transactionsData); // Store in IndexedDB
    }, (err) => {
      console.error('Error fetching transactions for spending: ', err);
    });

    return () => {
      unsubscribeBudgets();
      unsubscribeTransactions();
    };
  }, [userId]);

  if (loading && budgets.length === 0) {
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

  if (budgets.length === 0) {
    return (
      <Typography variant="h6" sx={{ mt: 5, textAlign: 'center' }}>
        No budgets set yet. Add some!
      </Typography>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, margin: 'auto', mt: 5 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Your Budgets
      </Typography>
      <List>
        {budgets.map((budget) => {
          const spent = spending[budget.category] || 0;
          const progress = (spent / budget.amount) * 100;
          return (
            <ListItem key={budget.id} divider>
              <ListItemIcon>
                <AccountBalanceWalletIcon />
              </ListItemIcon>
              <ListItemText
                primary={`${budget.category}: ${formatAmount(spent)} / ${formatAmount(budget.amount)}`}
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Spent: ${formatAmount(spent)} of ${formatAmount(budget.amount)}
                    </Typography>
                    <LinearProgress variant="determinate" value={Math.min(100, progress)} color={progress > 100 ? "error" : "primary"} sx={{ height: 10, borderRadius: 5 }} />
                    {progress > 100 && (
                      <Typography variant="body2" color="error">Over budget by ${formatAmount(spent - budget.amount)}</Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}

export default BudgetList;