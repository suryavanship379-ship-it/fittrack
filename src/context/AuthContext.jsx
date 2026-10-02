import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "../firebase"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null) // "owner", "trainer", "member"
  const [roleData, setRoleData] = useState(null) // holds trainer or member details
  const [loading, setLoading] = useState(true)

  // DND Mode
  const [dndMode, setDndMode] = useState(() => {
    const saved = localStorage.getItem("dndMode")
    return saved !== null ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem("dndMode", JSON.stringify(dndMode))
    if (dndMode) {
      document.body.classList.add("dnd")
    } else {
      document.body.classList.remove("dnd")
    }
  }, [dndMode])

  const toggleDndMode = () => setDndMode((prev) => !prev)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true)
      if (user) {
        setCurrentUser(user)
        try {
          const userDocRef = doc(db, "users", user.uid)
          const userDocSnap = await getDoc(userDocRef)
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()
            const role = userData.role ? userData.role.toLowerCase() : "owner"
            setUserRole(role)
            
            if (role === "trainer" && userData.trainerId) {
              const trainerDocRef = doc(db, "trainers", userData.trainerId)
              const trainerDocSnap = await getDoc(trainerDocRef)
              if (trainerDocSnap.exists()) {
                setRoleData({ id: userData.trainerId, ...trainerDocSnap.data() })
              } else {
                setRoleData({ id: userData.trainerId, name: userData.name || "Trainer" })
              }
            } else if (role === "member" && userData.memberId) {
              const memberDocRef = doc(db, "members", userData.memberId)
              const memberDocSnap = await getDoc(memberDocRef)
              if (memberDocSnap.exists()) {
                setRoleData({ id: userData.memberId, ...memberDocSnap.data() })
              } else {
                setRoleData({ id: userData.memberId, name: userData.name || "Member" })
              }
            } else {
              setRoleData({ name: userData.name || user.email })
            }
          } else {
            setUserRole("owner")
            setRoleData({ name: user.email || "Gym Owner" })
          }
        } catch (error) {
          console.error("Error fetching user role document: ", error)
          setUserRole("owner")
          setRoleData({ name: user.email || "Gym Owner" })
        }
      } else {
        setCurrentUser(null)
        setUserRole(null)
        setRoleData(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const value = {
    currentUser,
    userRole,
    roleData,
    loading,
    dndMode,
    toggleDndMode
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm tracking-wider">Authenticating...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}
