import React, { useEffect, useState } from 'react';
import { db } from '../../../services/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Box, Typography, List, ListItem, ListItemText, Paper, CircularProgress, ListItemIcon } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { setItem, getItem } from '../../../services/indexedDB';

function CategoryList({ userId }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const indexedDBKey = `categories_${userId}`;

    // Try to load from IndexedDB first
    getItem(indexedDBKey).then(cachedCategories => {
      if (cachedCategories) {
        setCategories(cachedCategories);
        setLoading(false);
      }
    });

    const q = query(
      collection(db, 'categories'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const categoriesData = [];
      querySnapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() });
      });
      setCategories(categoriesData);
      setLoading(false);
      setItem(indexedDBKey, categoriesData); // Store in IndexedDB
    }, (err) => {
      setError(err.message);
      setLoading(false);
      console.error('Error fetching categories: ', err);
    });

    return () => unsubscribe();
  }, [userId]);

  if (loading && categories.length === 0) {
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

  if (categories.length === 0) {
    return (
      <Typography variant="h6" sx={{ mt: 5, textAlign: 'center' }}>
        No categories yet. Add some!
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
        Your Categories
      </Typography>
      <List>
        {categories.map((category) => (
          <ListItem key={category.id} divider>
            <ListItemIcon>
              {category.type === 'income' ? <ArrowUpwardIcon color="success" /> : category.type === 'expense' ? <ArrowDownwardIcon color="error" /> : <CategoryIcon />}
            </ListItemIcon>
            <ListItemText
              primary={`${category.name} (${category.type})`}
              secondary={`Created: ${formatTimestampToDate(category.createdAt)}`}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export default CategoryList;