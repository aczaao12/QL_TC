import React, { useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { addTransactionDirectly } from '../utils/transactionService';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp
import dayjs from 'dayjs'; // Import dayjs for timestamp example

function ChatbotTransactionInput({ userId, onTransactionAdded }) {
  const [inputText, setInputText] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transactionResults, setTransactionResults] = useState([]); // Changed to array for multiple results

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    if (!GEMINI_API_KEY) {
      setError("Gemini API Key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse('');
    setTransactionResult(null);

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `You are a financial assistant. Your task is to extract transaction details from natural language input and return them as a JSON array of objects. Each JSON object should have the following structure: { "amount": number, "type": "expense" | "income", "category": string, "description": string, "timestamp"?: string (ISO 8601 format) }.\n\nIf the type is not explicitly mentioned, assume 'expense'. If the category is not clear, use 'Other'. If a specific date or time is mentioned, include it as an ISO 8601 string in the 'timestamp' field. Otherwise, omit the 'timestamp' field.\n\nExamples:\nUser: "Hôm nay chi 3k đá"\nJSON: [{
  "amount": 3000,
  "type": "expense",
  "category": "Food",
  "description": "Đá"
}]\n\nUser: "Mua sách 150k vào ngày 20/10/2023 và ăn trưa 50k"\nJSON: [\n  {\n    "amount": 150000,\n    "type": "expense",\n    "category": "Shopping",\n    "description": "Mua sách",\n    "timestamp": "2023-10-20T12:00:00Z"\n  },\n  {\n    "amount": 50000,\n    "type": "expense",\n    "category": "Food",\n    "description": "Ăn trưa"\n  }\n]\n\nUser: "Lương tháng này 10 triệu vào 15/09 và tiền điện 500k hôm qua"\nJSON: [\n  {\n    "amount": 10000000,\n    "type": "income",\n    "category": "Salary",\n    "description": "Lương tháng này",\n    "timestamp": "2025-09-15T12:00:00Z"\n  },\n  {\n    "amount": 500000,\n    "type": "expense",\n    "category": "Utilities",\n    "description": "Tiền điện",\n    "timestamp": "${dayjs().subtract(1, 'day').toISOString()}"\n  }\n]\n\nUser: "${inputText}"\nJSON:`;

      const result = await model.generateContent(prompt);
      const textResponse = await result.response.text();

      let jsonString = textResponse.trim();
      if (jsonString.startsWith('```json') && jsonString.endsWith('```')) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      }

      let parsedData = JSON.parse(jsonString);
      // Ensure parsedData is an array, even if Gemini returns a single object
      if (!Array.isArray(parsedData)) {
        parsedData = [parsedData];
      }

      setResponse(JSON.stringify(parsedData, null, 2));

      const currentTransactionResults = [];
      if (userId) {
        for (const transactionData of parsedData) {
          // Convert ISO 8601 timestamp string to Firebase Timestamp object if present
          if (transactionData.timestamp) {
            try {
              transactionData.timestamp = Timestamp.fromDate(new Date(transactionData.timestamp));
            } catch (e) {
              console.warn("Could not parse timestamp from Gemini response:", transactionData.timestamp, e);
              // Fallback to current server timestamp if parsing fails
              delete transactionData.timestamp; 
            }
          }
          try {
            const addResult = await addTransactionDirectly(userId, transactionData);
            currentTransactionResults.push(`Success: ${addResult.message} (Amount: ${transactionData.amount}, Category: ${transactionData.category})`);
          } catch (addError) {
            currentTransactionResults.push(`Error: ${addError.message} (Amount: ${transactionData.amount}, Category: ${transactionData.category})`);
            setError(`Failed to add one or more transactions: ${addError.message}`);
          }
        }
        setTransactionResults(currentTransactionResults);
        onTransactionAdded(); // Notify parent component to refresh list
      } else {
        setError("User not logged in. Cannot add transaction.");
      }

    } catch (err) {
      console.error("Chatbot error:", err);
      setError(`Failed to process your request: ${err.message}. Please ensure the input is clear and the API key is valid.`);
    } finally {
      setLoading(false);
      setInputText('');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>AI Transaction Assistant</Typography>
      <TextField
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        placeholder="Tell me about your transaction, e.g., 'Spent 50k on coffee this morning'"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        sx={{ mb: 2 }}
      />
      <Button
        variant="contained"
        onClick={handleSendMessage}
        disabled={loading || !inputText.trim()}
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Process Transaction'}
      </Button>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {response && (
        <Box sx={{ mt: 2, p: 2, border: '1px solid #ccc', borderRadius: 1, bgcolor: '#f5f5f5' }}>
          <Typography variant="subtitle2">AI Parsed Data (JSON):</Typography>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{response}</pre>
        </Box>
      )}
    </Box>
  );
}

export default ChatbotTransactionInput;
