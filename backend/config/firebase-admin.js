const admin = require('firebase-admin');

/**
 * Firebase Admin SDK Setup
 *
 * Steps:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (or use existing)
 * 3. Project Settings > Service Accounts > Generate New Private Key
 * 4. Download the JSON file
 * 5. Paste the contents of that JSON file into the serviceAccount object below
 */

const serviceAccount = require('./serviceAccountKey.json');
// Place your downloaded service account JSON file in this folder
// and rename it to: serviceAccountKey.json

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  console.error('Firebase Admin init error:', error);
}

module.exports = admin;
