// lib/firebaseAdmin.ts - Improved Firebase Admin Setup

import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// Firebase Admin setup
function initializeFirebaseAdmin() {
  // Only initialize if it hasn't been initialized already
  if (getApps().length === 0) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace newlines in the private key (if needed)
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
      throw new Error('Firebase Admin initialization failed');
    }
  }
  return admin;
}

// Initialize Firebase Admin
const adminInstance = initializeFirebaseAdmin();

// Export the initialized admin instance
export const authAdmin = adminInstance.auth();
export const dbAdmin = adminInstance.firestore();

// Improved token verification with better error handling
export async function verifyIdToken(token: string) {
  try {
    return await authAdmin.verifyIdToken(token, true); // Force check if revoked
  } catch (error: any) {
    console.error('Token verification error:', error);
    
    // Provide more specific error messages based on the error type
    if (error.code === 'auth/id-token-expired') {
      throw new Error('Token expired - please log in again');
    } else if (error.code === 'auth/id-token-revoked') {
      throw new Error('Token revoked - please log in again');
    } else {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }
}

export default adminInstance;