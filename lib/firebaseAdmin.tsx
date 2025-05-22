// lib/firebaseAdmin.ts

import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

function initializeFirebaseAdmin() {
  // Only initialize if it hasn't been initialized already
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const databaseURL = process.env.FIREBASE_DATABASE_URL;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing one or more Firebase Admin environment variables: ' +
        'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
      );
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        // Optional: only if you use Realtime Database
        databaseURL,
      });
      console.log('🔐 Firebase Admin initialized successfully');
    } catch (error: any) {
      console.error('❌ Firebase Admin initialization error:', error);
      throw new Error('Firebase Admin initialization failed');
    }
  }

  return admin;
}

// Initialize and export the singleton admin instance
const adminInstance = initializeFirebaseAdmin();

export const authAdmin = adminInstance.auth();
export const dbAdmin = adminInstance.firestore();

/**
 * Verify an ID token and optionally force revocation check.
 * @param token - Firebase ID token from the client
 */
export async function verifyIdToken(token: string) {
  try {
    // second argument true forces check for revoked tokens
    return await authAdmin.verifyIdToken(token, true);
  } catch (error: any) {
    console.error('🔍 Token verification error:', error);

    // Provide user-friendly messages based on Firebase error codes
    switch (error.code) {
      case 'auth/id-token-expired':
        throw new Error('Token expired – please log in again');
      case 'auth/id-token-revoked':
        throw new Error('Token revoked – please log in again');
      default:
        throw new Error(`Invalid token: ${error.message}`);
    }
  }
}

export default adminInstance;
