/**
 * lib/firebase/admin.ts
 * Singleton Firebase Admin SDK initialiser.
 * Credentials from env vars — never exposed client-side.
 */
import * as admin from "firebase-admin";

let _db: admin.firestore.Firestore | null = null;

export function getDb(): admin.firestore.Firestore {
  if (_db) return _db;

  if (admin.apps.length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      const sa = JSON.parse(
        Buffer.from(serviceAccountJson, "base64").toString("utf8")
      );
      admin.initializeApp({ credential: admin.credential.cert(sa) });
    } else {
      const projectId   = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
          "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or " +
          "FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY"
        );
      }
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
  }

  _db = admin.firestore();
  return _db;
}
