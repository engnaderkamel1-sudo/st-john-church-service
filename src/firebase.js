import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, memoryLocalCache, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA6gVQW-KJiHMviPI1r8sQ0vVagjLYK9p4",
  authDomain: "st-john-church-service.firebaseapp.com",
  projectId: "st-john-church-service",
  storageBucket: "st-john-church-service.firebasestorage.app",
  messagingSenderId: "182993459639",
  appId: "1:182993459639:web:24bcb24e8965c043b3f032",
  measurementId: "G-3Z3R1215XT"
};

// Initialize Firebase with persistent offline cache support
const app = initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager()
    })
  });
} catch (e) {
  console.warn("Firestore persistent cache fallback:", e);
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache()
    });
  } catch (memErr) {
    firestoreDb = getFirestore(app);
  }
}

export const db = firestoreDb;
export const auth = getAuth(app);

export default app;
