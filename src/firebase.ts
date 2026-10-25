import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const env = import.meta.env

// Firebase web config is public by design; access is enforced by Auth and firestore.rules.
// Env vars override it, e.g. to point at the emulators (see .env.example).
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyA6l-RFmOMy0dmmootdHzcyXzuMJ8H5KM8',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'uwrroster.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'uwrroster',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'uwrroster.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '421011583318',
  appId: env.VITE_FIREBASE_APP_ID || '1:421011583318:web:dbd6d4d854e48b919de6f7',
})

export const auth = getAuth(app)
// Keep a copy of the data on the device so the app works on a poor pool-side connection:
// pages open from the cache and changes are sent when the connection comes back.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
