import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../services/firebase';
import { TextField, Button, Box, Typography, Paper } from '@mui/material';

function Auth({ showSnackbar }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        showSnackbar('Registration successful!', 'success');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showSnackbar('Login successful!', 'success');
      }
    } catch (err) {
      setError(err.message);
      showSnackbar(`Authentication failed: ${err.message}`, 'error');
      console.error(err);
    }
  };


  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 400, margin: 'auto', mt: 5 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {isRegistering ? 'Register' : 'Login'}
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          {isRegistering ? 'Register' : 'Login'}
        </Button>
      </form>
      <Button
        variant="text"
        color="secondary"
        fullWidth
        sx={{ mt: 1 }}
        onClick={() => setIsRegistering(!isRegistering)}
      >
        {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
      </Button>
      {/* Logout button is now handled in App.jsx for global state management */}
    </Paper>
  );
}

export default Auth;