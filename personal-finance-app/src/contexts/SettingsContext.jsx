import React, { createContext, useState, useEffect, useContext } from 'react';
import currency from 'currency.js';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyCode, setCurrencyCode] = useState('USD'); // e.g., USD, EUR
  const [useDigitSeparator, setUseDigitSeparator] = useState(true);

  useEffect(() => {
    const savedCurrencySymbol = localStorage.getItem('currencySymbol');
    const savedCurrencyCode = localStorage.getItem('currencyCode');
    const savedUseDigitSeparator = localStorage.getItem('useDigitSeparator');

    if (savedCurrencySymbol) {
      setCurrencySymbol(savedCurrencySymbol);
    }
    if (savedCurrencyCode) {
      setCurrencyCode(savedCurrencyCode);
    }
    if (savedUseDigitSeparator !== null) {
      setUseDigitSeparator(JSON.parse(savedUseDigitSeparator));
    }
  }, []);

  const saveSettings = (newCurrencySymbol, newCurrencyCode, newUseDigitSeparator) => {
    setCurrencySymbol(newCurrencySymbol);
    setCurrencyCode(newCurrencyCode);
    setUseDigitSeparator(newUseDigitSeparator);
    localStorage.setItem('currencySymbol', newCurrencySymbol);
    localStorage.setItem('currencyCode', newCurrencyCode);
    localStorage.setItem('useDigitSeparator', JSON.stringify(newUseDigitSeparator));
  };

  const formatAmount = (amount) => {
    if (currencyCode === 'VND') {
      return currency(amount, {
        symbol: currencySymbol,
        separator: useDigitSeparator ? '.' : '',
        decimal: ',',
        precision: 0,
        pattern: '# !',
      }).format();
    } else {
      return currency(amount, {
        symbol: currencySymbol,
        separator: useDigitSeparator ? ',' : '',
        decimal: '.',
        precision: 2,
      }).format();
    }
  };

  return (
    <SettingsContext.Provider value={{
      currencySymbol,
      currencyCode,
      useDigitSeparator,
      saveSettings,
      formatAmount,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
