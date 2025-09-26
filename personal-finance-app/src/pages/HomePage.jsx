import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div>
      <h1>Welcome to your Personal Ecosystem!</h1>
      <nav>
        <ul>
          <li><Link to="/finance">Finance App</Link></li>
          <li><Link to="/lectures">Lectures App</Link></li>
          <li><Link to="/news">News App</Link></li>
        </ul>
      </nav>
    </div>
  );
}

export default HomePage;
