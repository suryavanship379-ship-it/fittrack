import { useState } from "react"
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut 
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "../firebase"
import { useNavigate } from "react-router-dom"
import { Mail, Lock, Check, ArrowRight, KeyRound, User, UserPlus, LogIn } from "lucide-react"
import { authAPI, validateForm } from "../services/api"
import "./Login.css"

function Login() {
  const [isRegister, setIsRegister] = useState(false)
  
  // Login / Register Form States
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const navigate = useNavigate()

  // Handle Firebase Sign-In
  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setSuccessMsg("")

    const emailErr = validateForm.email(email)
    if (emailErr) {
      setError(emailErr)
      return
    }

    if (!password) {
      setError("Password is required")
      return
    }

    setLoading(true)

    try {
      const cleanEmail = email.trim()
      let firebaseUser = null
      let userRole = "member"

      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password)
        firebaseUser = userCredential.user
      } catch (authErr) {
        // If owner email and not found in Firebase Auth yet, auto-initialize owner account
        if ((authErr.code === "auth/user-not-found" || authErr.code === "auth/invalid-credential") && cleanEmail.toLowerCase() === "owner@fittrack.com") {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password)
            firebaseUser = userCredential.user
            userRole = "owner"
            await setDoc(doc(db, "users", firebaseUser.uid), {
              uid: firebaseUser.uid,
              name: "Gym Owner",
              email: cleanEmail,
              role: "owner",
              createdAt: new Date().toISOString()
            })
          } catch (regErr) {
            throw authErr
          }
        } else {
          throw authErr
        }
      }

      // 2. Fetch User Profile & Role from Firestore
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid)
          const userDocSnap = await getDoc(userDocRef)
          if (userDocSnap.exists()) {
            userRole = (userDocSnap.data().role || "member").toLowerCase()
          } else if (cleanEmail.toLowerCase() === "owner@fittrack.com") {
            userRole = "owner"
            await setDoc(doc(db, "users", firebaseUser.uid), {
              uid: firebaseUser.uid,
              name: "Gym Owner",
              email: cleanEmail,
              role: "owner",
              createdAt: new Date().toISOString()
            })
          }
        } catch (docErr) {
          console.warn("Could not fetch user document notice:", docErr)
          if (cleanEmail.toLowerCase() === "owner@fittrack.com") userRole = "owner"
        }
      }

      // 3. Obtain JWT token from Spring Boot REST API for backend APIs
      try {
        const authData = await authAPI.login(cleanEmail, password, userRole)
        if (authData?.token) {
          localStorage.setItem("token", authData.token)
        }
      } catch (apiErr) {
        console.warn("Spring Boot REST API token notice:", apiErr.message)
      }

      // 4. Route user to appropriate Dashboard based on Role
      if (userRole === "owner") {
        navigate("/dashboard")
      } else if (userRole === "trainer") {
        navigate("/trainer-dashboard")
      } else {
        navigate("/member-dashboard")
      }
    } catch (err) {
      console.error("FULL FIREBASE ERROR:", err.code, err.message, err)
      const codeStr = err.code ? `[${err.code}] ` : ""
      setError(`${codeStr}${err.message || "Failed to sign in. Please try again."}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle Firebase User Registration (Default Role: MEMBER)
  const handleRegister = async (e) => {
    e.preventDefault()
    setError("")
    setSuccessMsg("")

    const nameErr = validateForm.required(name, "Full Name")
    if (nameErr) { setError(nameErr); return }

    const emailErr = validateForm.email(email)
    if (emailErr) { setError(emailErr); return }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long (e.g. 123456)")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please confirm your password.")
      return
    }

    setLoading(true)

    try {
      // 1. Create Firebase Authentication Account
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const firebaseUser = userCredential.user

      // 2. Create User Profile & Role in Firestore `users` Collection
      await setDoc(doc(db, "users", firebaseUser.uid), {
        uid: firebaseUser.uid,
        name: name.trim(),
        email: email.trim(),
        role: "member",
        createdAt: new Date().toISOString()
      })

      // 3. Sign out temporary registration state so user can sign in via Sign In tab
      const registeredEmail = email.trim()
      await signOut(auth)

      // 4. Switch to Sign In tab, pre-fill email, and show success message
      setName("")
      setPassword("")
      setConfirmPassword("")
      setEmail(registeredEmail)
      setIsRegister(false)
      setSuccessMsg("Account registered successfully! Please enter your password to sign in.")
    } catch (err) {
      console.error("Firebase Registration Error:", err)
      const codeStr = err.code ? `[${err.code}] ` : ""
      setError(`${codeStr}${err.message || "Failed to create account. Please try again."}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle Forgot Password
  const handleForgotPassword = async () => {
    setError("")
    setSuccessMsg("")

    if (!email || !email.trim()) {
      setError("Please enter your Email Address above to receive a password reset link.")
      return
    }

    setResetLoading(true)
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSuccessMsg(`Password reset email sent to ${email}! Please check your inbox (including spam folder).`)
    } catch (err) {
      console.error("Password reset error:", err)
      const codeStr = err.code ? `[${err.code}] ` : ""
      setError(`${codeStr}${err.message || "Failed to send password reset email. Please try again."}`)
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-bg-overlay"></div>
      <div className="login-mesh"></div>

      <div className="login-content">
        {/* Left Hero Panel */}
        <div className="hero-panel">
          <h1 className="hero-brand">
            FIT<span className="accent">TRACK</span>
          </h1>
          <p className="hero-tagline">Track. Train. Transform.</p>

          <ul className="hero-features">
            <li>
              <div className="feature-icon-wrapper">
                <Check size={16} strokeWidth={3} />
              </div>
              <span>Manage Members</span>
            </li>
            <li>
              <div className="feature-icon-wrapper">
                <Check size={16} strokeWidth={3} />
              </div>
              <span>Track Attendance</span>
            </li>
            <li>
              <div className="feature-icon-wrapper">
                <Check size={16} strokeWidth={3} />
              </div>
              <span>Monitor Payments</span>
            </li>
            <li>
              <div className="feature-icon-wrapper">
                <Check size={16} strokeWidth={3} />
              </div>
              <span>Analytics & Reports</span>
            </li>
          </ul>
        </div>

        {/* Right Form Panel */}
        <div className="form-panel">
          <div className="login-card">
            
            {/* Mobile Branding */}
            <div className="mobile-brand">
              <h1>FIT<span className="accent">TRACK</span></h1>
            </div>

            {/* Auth Mode Tabs (Sign In / Register) */}
            <div className="flex border-b border-gray-800 mb-6">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(""); setSuccessMsg(""); }}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                  !isRegister ? "border-red-600 text-white font-bold" : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(""); setSuccessMsg(""); }}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                  isRegister ? "border-red-600 text-white font-bold" : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <UserPlus size={16} />
                <span>Register Account</span>
              </button>
            </div>

            <div className="login-card-header">
              <span className="welcome-badge">{isRegister ? "NEW MEMBER REGISTRATION" : "SECURE PORTAL ACCESS"}</span>
              <h2>{isRegister ? "Create FitTrack Account" : "Sign In to FitTrack"}</h2>
              <p className="login-subtitle">
                {isRegister ? "Register as a gym member to access your workout portal" : "Enter your account credentials to access your dashboard"}
              </p>
            </div>

            {error && (
              <p className="bg-red-950/70 text-red-300 p-3.5 rounded-xl mb-5 text-center text-xs font-medium border border-red-800">
                {error}
              </p>
            )}

            {successMsg && (
              <p className="bg-emerald-950/70 text-emerald-300 p-3.5 rounded-xl mb-5 text-center text-xs font-medium border border-emerald-800">
                {successMsg}
              </p>
            )}

            {isRegister ? (
              /* REGISTRATION FORM */
              <form onSubmit={handleRegister} className="login-form-fields">
                <div className="input-container">
                  <label className="input-label">Full Name</label>
                  <div className="input-wrapper">
                    <User className="input-icon-left" size={18} />
                    <input
                      type="text"
                      placeholder="e.g. Sanika Patel"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-container">
                  <label className="input-label">Email Address</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon-left" size={18} />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-container">
                  <label className="input-label">Password (e.g. 123456)</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon-left" size={18} />
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="input-container">
                  <label className="input-label">Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon-left" size={18} />
                    <input
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="login-btn mt-2">
                  <span>{loading ? "Creating Account..." : "Complete Registration"}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              /* LOGIN FORM */
              <form onSubmit={handleLogin} className="login-form-fields">
                <div className="input-container">
                  <label className="input-label">Email Address</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon-left" size={18} />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-container">
                  <div className="input-label-header">
                    <label className="input-label">Password</label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="forgot-password-link"
                    >
                      <KeyRound size={13} />
                      <span>{resetLoading ? "Sending Link..." : "Forgot Password?"}</span>
                    </button>
                  </div>
                  <div className="input-wrapper">
                    <Lock className="input-icon-left" size={18} />
                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="login-btn mt-2">
                  <span>{loading ? "Signing In..." : "Sign In to Portal"}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default Login