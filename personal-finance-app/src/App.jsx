import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import FinanceApp from './apps/finance/FinanceApp';

// Placeholder components for new apps
const LecturesApp = () => <div>Lectures Application</div>;
const NewsApp = () => <div>News Application</div>;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/finance/*" element={<FinanceApp />} />
        <Route path="/lectures/*" element={<LecturesApp />} />
        <Route path="/news/*" element={<NewsApp />} />
      </Routes>
    </Router>
  );
}

export default App;
