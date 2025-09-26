import React, { useState } from 'react';
import { Box, Typography, Grid, Button, IconButton, Modal, Paper } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useNavigate } from 'react-router-dom';
import TransactionList from './TransactionList';
import ChatbotTransactionInput from './ChatbotTransactionInput';

function Transactions({ userId, showSnackbar }) {
  const navigate = useNavigate();
  const [openChatbot, setOpenChatbot] = useState(false);

  const handleAddTransactionClick = () => {
    navigate('/transactions/add');
  };

  const handleEditTransaction = (transaction) => {
    navigate(`/transactions/edit/${transaction.id}`);
  };

  const handleChatbotClose = () => {
    setOpenChatbot(false);
  };

  const handleTransactionAddedByChatbot = () => {
    // This function will be called when a transaction is successfully added via chatbot
    // You might want to refresh the transaction list or show a snackbar
    showSnackbar('Transaction added via AI assistant!', 'success');
    // Optionally, you might want to close the chatbot modal after a successful add
    // setOpenChatbot(false);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom>Transactions</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleAddTransactionClick}>
          Add New Transaction
        </Button>
        <IconButton color="primary" onClick={() => setOpenChatbot(true)}>
          <ChatBubbleOutlineIcon />
        </IconButton>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TransactionList
            userId={userId}
            showSnackbar={showSnackbar}
            onEdit={handleEditTransaction}
          />
        </Grid>
      </Grid>

      <Modal
        open={openChatbot}
        onClose={handleChatbotClose}
        aria-labelledby="chatbot-modal-title"
        aria-describedby="chatbot-modal-description"
      >
        <Paper sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
        }}>
          <ChatbotTransactionInput
            userId={userId}
            onTransactionAdded={handleTransactionAddedByChatbot}
          />
          <Button onClick={handleChatbotClose} sx={{ mt: 2 }}>Close</Button>
        </Paper>
      </Modal>
    </Box>
  );
} 

export default Transactions;
