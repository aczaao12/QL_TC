// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
