import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import FinanceApp from './apps/finance/FinanceApp';
import MainLayout from './shared/components/MainLayout'; // Import MainLayout

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}> {/* Use MainLayout as the parent route */}
          <Route index element={<FinanceApp />} />
          <Route path="finance/*" element={<FinanceApp />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
