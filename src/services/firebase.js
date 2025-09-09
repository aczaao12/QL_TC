import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBIeRWKoBTllCpdqEaRukS6V62ddFABps",
  authDomain: "ql-tc-65613.firebaseapp.com",
  databaseURL: "https://ql-tc-65613-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ql-tc-65613",
  storageBucket: "ql-tc-65613.firebasestorage.app",
  messagingSenderId: "186724776357",
  appId: "1:186724776357:web:445be47a462fb7d937504c",
  measurementId: "G-HWQGTSE65Q"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);