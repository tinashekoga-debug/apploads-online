// =====================
// Firebase Configuration
// =====================

// --- Core Firebase SDK ---
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

// --- Firestore (Database) ---
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, doc, setDoc, getDoc, getDocs,
  deleteDoc, query, orderBy, where, updateDoc, increment,
  serverTimestamp, limit, startAfter
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// --- Authentication ---
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// --- Analytics ---
import { getAnalytics, logEvent } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

// =====================
// Firebase App Init
// =====================

const firebaseConfig = {
  apiKey: "AIzaSyCVmRSQLBi2PESf1Tj43-t0x64lki-H0dU",
  authDomain: "apploads-online.firebaseapp.com",  // ← CHANGE THIS LINE
  projectId: "apploads-online",
  storageBucket: "apploads-online.firebasestorage.app",
  messagingSenderId: "912753061359",
  appId: "1:912753061359:web:ec72338303413c10efda1a",
  measurementId: "G-4PXSRZC7M0"
};

// Initialize core Firebase services
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// -----------------------------
// Enable SDK IndexedDB persistence
// -----------------------------
// This enables Firestore's built-in offline persistence (reads from local cache,
// queues writes while offline, and syncs automatically when online).
//
// Typical failures:
// - 'failed-precondition' => multiple tabs open (persistence only active in one tab)
// - 'unimplemented' => browser does not support required features
// -----------------------------

const auth = getAuth(app);
const analytics = getAnalytics(app);

// =====================
// Optional Helper: Event Tracking
// =====================

function trackEvent(name, params = {}) {
  try {
    logEvent(analytics, name, params);
  } catch (err) {
    console.warn('Analytics logEvent failed:', err);
  }
}

// =====================
// Exports
// =====================

export {
  app,
  auth,
  db,
  analytics,
  logEvent,
  trackEvent,

  // --- Auth methods ---
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,

  // --- Firestore methods ---
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  where,
  updateDoc,
  increment,
  serverTimestamp,
  limit,
  startAfter
};