import { Link, Outlet } from 'react-router-dom';
import React from 'react';
import { AuthProvider, useAuth } from '../components/AuthContext'; // Adjust path as needed
import { signOut } from 'firebase/auth'; // Will need to set up firebase in Vite
import { auth } from '../services/firebase'; // Will need to set up firebase in Vite
import { useEffect } from 'react';

export default function MainLayout() {
  const { user, loading } = useAuth();

  // Service Worker registration (Next.js specific, will need adaptation for Vite)
  useEffect(() => {
    // if ('serviceWorker' in navigator) {
    //   window.addEventListener('load', function() {
    //     navigator.serviceWorker.register('/firebase-messaging-sw.js').then(function(registration) {
    //       console.log('ServiceWorker registration successful with scope: ', registration.scope);
    //     }, function(err) {
    //       console.log('ServiceWorker registration failed: ', err);
    //     });
    //   });
    // }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert('Logged out successfully!');
    } catch (error) {
      console.error('Logout error:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        alert(`Logout failed: ${error.message}`);
      } else {
        alert('Logout failed: An unknown error occurred.');
      }
    }
  };

  return (
    <AuthProvider>
      <nav className="bg-gray-800 p-4">
        <ul className="flex space-x-4 items-center">
          <li>
            <Link to="/" className="text-white hover:text-gray-300">
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/transactions" className="text-white hover:text-gray-300">
              Giao dịch
            </Link>
          </li>
          <li>
            <Link to="/add-transaction" className="text-white hover:text-gray-300">
              Thêm Giao dịch (AI)
            </Link>
          </li>
          <li>
            <Link to="/ai-query" className="text-white hover:text-gray-300">
              Hỏi AI
            </Link>
          </li>
          <li>
            <Link to="/settings" className="text-white hover:text-gray-300">
              Cài đặt
            </Link>
          </li>
          {/* Authentication Links */}
          <li className="ml-auto">
            {loading ? (
              <span className="text-gray-400">Loading...</span>
            ) : user ? (
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-700 text-white text-sm py-1 px-2 rounded"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="bg-green-500 hover:bg-green-700 text-white text-sm py-1 px-2 rounded">
                Login
              </Link>
            )}
          </li>
        </ul>
      </nav>
      <Outlet />
    </AuthProvider>
  );
}
