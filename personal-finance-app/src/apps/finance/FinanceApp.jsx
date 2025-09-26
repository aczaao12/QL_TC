import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, CssBaseline, Snackbar, Alert,
  IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, useMediaQuery,
  BottomNavigation, BottomNavigationAction
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CategoryIcon from '@mui/icons-material/Category';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { auth } from '../../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useTheme } from '@mui/material/styles';

import LoginRegister from './components/LoginRegister';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import AddEditTransaction from './components/AddEditTransaction';
import Categories from './components/Categories';
import Budgets from './components/Budgets';
import Reports from './components/Reports';
import Settings from './components/Settings';
import SettingsIcon from '@mui/icons-material/Settings';

const drawerWidth = 240;

function App() {
  const [user, setUser] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [value, setValue] = useState(0); // For BottomNavigation
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/finance/login'); // Redirect to login if not authenticated
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showSnackbar('Logged out successfully!', 'success');
      navigate('/finance/login');
    } catch (err) {
      showSnackbar(`Logout failed: ${err.message}`, 'error');
      console.error(err);
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navItems = user ? [
    { name: 'Dashboard', path: '/finance/', icon: <HomeIcon /> },
    { name: 'Transactions', path: '/finance/transactions', icon: <ReceiptLongIcon /> },
    { name: 'Categories', path: '/finance/categories', icon: <CategoryIcon /> },
    { name: 'Budgets', path: '/finance/budgets', icon: <AccountBalanceWalletIcon /> },
    { name: 'Reports', path: '/finance/reports', icon: <AssessmentIcon /> },
    { name: 'Settings', path: '/finance/settings', icon: <SettingsIcon /> },
  ] : [];

  useEffect(() => {
    // Set initial value for BottomNavigation based on current path
    const currentPath = window.location.pathname;
    const index = navItems.findIndex(item => item.path === currentPath);
    if (index !== -1) {
      setValue(index);
    }
  }, [navItems]);

  const handleTransactionSaved = () => {
    navigate('/finance/transactions'); // Navigate back to transactions list after save
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="fixed" component="nav" sx={{ width: '100%', ml: 0 }}>
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'block', sm: 'block' } }}
          >
            Personal Finance
          </Typography>
          {!user && (
            <Button color="inherit" component={Link} to="/finance/login">Login / Register</Button>
          )}
          {user && (
            <Button color="inherit" onClick={handleLogout}>Logout</Button>
          )}
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px', pb: user ? '56px' : 0 }}>
        <Toolbar />
        <Routes>
          <Route path="login" element={<LoginRegister showSnackbar={showSnackbar} />} />
          {user ? (
            <>
              <Route path="dashboard" element={<Dashboard userId={user.uid} showSnackbar={showSnackbar} />} />
              <Route path="transactions" element={<Transactions userId={user.uid} showSnackbar={showSnackbar} />} />
              <Route path="transactions/add" element={<AddEditTransaction userId={user.uid} showSnackbar={showSnackbar} onTransactionSaved={handleTransactionSaved} />} />
              <Route path="transactions/edit/:transactionId" element={<AddEditTransaction userId={user.uid} showSnackbar={showSnackbar} onTransactionSaved={handleTransactionSaved} />} />
              <Route path="categories" element={<Categories userId={user.uid} showSnackbar={showSnackbar} />} />
              <Route path="budgets" element={<Budgets userId={user.uid} showSnackbar={showSnackbar} />} />
              <Route path="reports" element={<Reports userId={user.uid} showSnackbar={showSnackbar} />} />
              <Route path="settings" element={<Settings showSnackbar={showSnackbar} />} />
              <Route path="/" element={<Dashboard userId={user.uid} showSnackbar={showSnackbar} />} />
            </>
          ) : (
            <Route path="/" element={
              <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mt: 5 }}>
                Please Login or Register to manage your finances.
              </Typography>
            } />
          )}
        </Routes>
      </Box>
      {user && (
        <BottomNavigation
          value={value}
          onChange={(event, newValue) => {
            setValue(newValue);
            navigate(navItems[newValue].path);
          }}
          showLabels
          sx={{ width: '100%', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
        >
          {navItems.map((item, index) => (
            <BottomNavigationAction key={item.name} label={item.name} icon={item.icon} />
          ))}
        </BottomNavigation>
      )}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;