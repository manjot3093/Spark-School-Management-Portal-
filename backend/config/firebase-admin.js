const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let serviceAccount = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Loaded from environment variable (useful for cloud hosts like Render)
    serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : process.env.FIREBASE_SERVICE_ACCOUNT;
  } else {
    const keyPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      serviceAccount = require(keyPath);
    }
  }

  if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully');
  } else if (!serviceAccount) {
    console.warn('⚠️ Firebase Admin: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT env var not provided.');
  }
} catch (error) {
  console.error('Firebase Admin init error:', error);
}

module.exports = admin;
