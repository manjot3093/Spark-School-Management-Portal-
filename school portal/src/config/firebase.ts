import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// ⚠️ IMPORTANT: Create your own Firebase project at https://console.firebase.google.com
// Then go to Project Settings > Your Apps > Web App > Firebase SDK snippet > Config
// Replace the config below with your own Firebase project config

const firebaseConfig = {
  apiKey: "AIzaSyDh1Wlp-0n2O_QYvGiQ5FWbarGkMSe1Y9E",
  authDomain: "spark-code-daaa7.firebaseapp.com",
  projectId: "spark-code-daaa7",
  storageBucket: "spark-code-daaa7.firebasestorage.app",
  messagingSenderId: "192530852873",
  appId: "1:192530852873:web:563853bdc387ccad645cd8",
  measurementId: "G-1LXNYPHS7R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
