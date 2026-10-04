import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "../firebase"
import { useNavigate } from "react-router-dom"
import { Mail, Lock, Check, ArrowRight } from "lucide-react"
import { authAPI, validateForm } from "../services/api"
import "./Login.css"

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [loading, setLoading] = useState(false)

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
      const isOwnerEmail = cleanEmail.toLowerCase() === "ownerfittrack@gmail.com"
      
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password)
      const firebaseUser = userCredential.user

      let userRole = isOwnerEmail ? "owner" : "member"

      // Fetch User Profile & Role from Firestore
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid)
          const userDocSnap = await getDoc(userDocRef)
          if (userDocSnap.exists()) {
            const data = userDocSnap.data()
            if (isOwnerEmail) {
              userRole = "owner"
            } else {
              userRole = (data.role || "member").toLowerCase()
            }
          } else if (isOwnerEmail) {
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
          if (isOwnerEmail) userRole = "owner"
        }
      }

      // Obtain JWT token from Spring Boot REST API for backend APIs
      try {
        const authData = await authAPI.login(cleanEmail, password, userRole)
        if (authData?.token) {
          localStorage.setItem("token", authData.token)
        }
      } catch (apiErr) {
        console.warn("Spring Boot REST API token notice:", apiErr.message)
      }

      // Route user to appropriate Dashboard based on Role
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

            <div className="login-card-header">
              <span className="welcome-badge">SECURE PORTAL ACCESS</span>
              <h2>Sign In to FitTrack</h2>
              <p className="login-subtitle">
                Enter your account credentials to access your portal
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

            {/* LOGIN FORM */}
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
                <label className="input-label">Password</label>
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

              <button type="submit" disabled={loading} className="login-btn mt-4">
                <span>{loading ? "Signing In..." : "Sign In to Portal"}</span>
                <ArrowRight size={18} />
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Login