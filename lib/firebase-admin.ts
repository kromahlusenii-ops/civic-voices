import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App;

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Initialize Firebase Admin with service account
  // In production, use environment variables for the service account
  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });

  return adminApp;
}

export async function verifyFirebaseToken(token: string) {
  try {
    const app = getAdminApp();
    const decodedToken = await getAuth(app).verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    return null;
  }
}

export { getAdminApp };
