
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Defensive initialization
let app;
try {
  if (!getApps().length) {
    // Only attempt init if the keys aren't placeholders
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
      app = initializeApp(firebaseConfig);
    } else {
      console.warn("Firebase: Using placeholder keys. App will run in Mock Mode.");
      app = null;
    }
  } else {
    app = getApp();
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
  app = null;
}

export const auth = app ? getAuth(app) : ({} as any);
export const db = app ? getDatabase(app) : ({} as any);
export default app;
