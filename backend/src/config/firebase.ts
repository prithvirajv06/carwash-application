import admin from 'firebase-admin';
import { logger } from '../utils/logger';

export const initializeFirebase = (): void => {
  if (admin.apps.length > 0) return;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

  logger.info('Firebase Admin initialized');
};

export const verifyFirebaseToken = async (idToken: string): Promise<admin.auth.DecodedIdToken> => {
  return admin.auth().verifyIdToken(idToken);
};

export default admin;
