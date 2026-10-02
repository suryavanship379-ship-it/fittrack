import { initializeApp, deleteApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyDst6ZebakPbtGkdO4VDWM-vK_kgJm8iDc",
  authDomain: "fittrack-8ace5.firebaseapp.com",
  projectId: "fittrack-8ace5",
  storageBucket: "fittrack-8ace5.firebasestorage.app",
  messagingSenderId: "975317866849",
  appId: "1:975317866849:web:c63b83a161c9fd3560cd20",
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)

export const auth = getAuth(app)

export const createSecondaryUser = async (email, password) => {
  const secondaryApp = initializeApp(firebaseConfig, "Secondary")
  const secondaryAuth = getAuth(secondaryApp)
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    const uid = userCredential.user.uid
    await signOut(secondaryAuth)
    return uid
  } finally {
    await deleteApp(secondaryApp)
  }
}
