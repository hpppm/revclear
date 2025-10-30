import * as admin from 'firebase-admin';

let firebaseAdminInitialized = false;

if (!admin.apps.length) {
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
    if (serviceAccountPath && serviceAccountPath !== './path/to/your/firebase-service-account-key.json') {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseAdminInitialized = true;
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY_PATH is not set or is a placeholder. Firebase Admin SDK will not be fully functional.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error.message);
    console.warn('Firebase Admin SDK will not be fully functional.');
  }
}

export const auth = firebaseAdminInitialized ? admin.auth() : ({} as admin.auth.Auth);