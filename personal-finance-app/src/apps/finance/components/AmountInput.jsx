import React, { useState, useCallback } from 'react';
import { TextField, InputAdornment, Typography, Box, Chip } from '@mui/material';
import { useSettings } from "../../../shared/contexts/SettingsContext";

function AmountInput({ value, onChange, label, ...props }) {
  const { currencySymbol, useDigitSeparator } = useSettings();
  const [suggestions, setSuggestions] = useState([]);

  const handleInputChange = useCallback((e) => {
    const inputValue = e.target.value;
    onChange(e); // Pass the event up to the parent component

    const num = parseFloat(inputValue);

    // Suggestion logic
    if (!isNaN(num) && isFinite(num) && num > 0) {
      const newSuggestions = [];
      // Generate suggestions by appending zeros
      for (let i = 1; i <= 6; i++) { // Generate up to 6 magnitudes of suggestions
        const suggestionValue = num * Math.pow(10, i);
        newSuggestions.push(suggestionValue);
      }
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault(); // Prevent form submission
      onChange({ target: { value: suggestions[0].toString() } }); // Apply the first suggestion
      setSuggestions([]); // Clear suggestions
    }
  }, [suggestions, onChange]);

  const handleAcceptSuggestion = useCallback((suggestedValue) => {
    onChange({ target: { value: suggestedValue.toString() } });
    setSuggestions([]);
  }, [onChange]);

  const formatSuggestion = (num) => {
    return new Intl.NumberFormat('en-US', { useGrouping: useDigitSeparator }).format(num);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        label={label}
        type="number"
        fullWidth
        margin="normal"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        InputProps={{
          startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
        }}
        {...props}
      />
      {suggestions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="textSecondary">Suggestions:</Typography>
          {suggestions.map((s) => (
            <Chip
              key={s}
              label={formatSuggestion(s)}
              onClick={() => handleAcceptSuggestion(s)}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default AmountInput;
