import React, { useState, useEffect } from 'react';
import { Paper, Typography, TextField, Button, Box, FormControlLabel, Switch } from '@mui/material';
import { useSettings } from '../../../shared/contexts/SettingsContext';

function Settings({ showSnackbar }) {
  const { currencySymbol: contextCurrencySymbol, currencyCode: contextCurrencyCode, useDigitSeparator: contextUseDigitSeparator, saveSettings } = useSettings();
  const [currencySymbol, setCurrencySymbol] = useState(contextCurrencySymbol);
  const [currencyCode, setCurrencyCode] = useState(contextCurrencyCode);
  const [useDigitSeparator, setUseDigitSeparator] = useState(contextUseDigitSeparator);

  useEffect(() => {
    setCurrencySymbol(contextCurrencySymbol);
    setCurrencyCode(contextCurrencyCode);
    setUseDigitSeparator(contextUseDigitSeparator);
  }, [contextCurrencySymbol, contextCurrencyCode, contextUseDigitSeparator]);

  const handleSaveSettings = () => {
    saveSettings(currencySymbol, currencyCode, useDigitSeparator);
    showSnackbar('Settings saved successfully!', 'success');
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, margin: 'auto', mt: 5 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Settings
      </Typography>
      <Box component="form" sx={{ '& .MuiTextField-root': { mt: 2, mb: 1 } }}>
        <TextField
          label="Currency Symbol"
          fullWidth
          value={currencySymbol}
          onChange={(e) => setCurrencySymbol(e.target.value)}
          helperText="e.g., $, €, £, ¥"
        />
        <TextField
          label="Currency Code"
          fullWidth
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value)}
          helperText="e.g., USD, EUR, GBP (used for advanced formatting)"
        />
        <FormControlLabel
          control={
            <Switch
              checked={useDigitSeparator}
              onChange={(e) => setUseDigitSeparator(e.target.checked)}
              name="digitSeparator"
              color="primary"
            />
          }
          label="Use Digit Separator (e.g., 1,000.00)"
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3 }}
          onClick={handleSaveSettings}
        >
          Save Settings
        </Button>
      </Box>
    </Paper>
  );
}

export default Settings;
