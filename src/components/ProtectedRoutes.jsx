import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const getHomePath = (role) => {
  if (role === "owner") return "/dashboard"
  if (role === "trainer") return "/trainer-dashboard"
  if (role === "member") return "/member-dashboard"
  return "/login"
}

export const OwnerRoute = ({ children }) => {
  const { currentUser, userRole } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (userRole === "member") {
    return <Navigate to="/member-dashboard" replace />
  }

  if (userRole === "trainer") {
    return <Navigate to="/trainer-dashboard" replace />
  }

  return children
}

export const TrainerRoute = ({ children }) => {
  const { currentUser, userRole } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (userRole !== "trainer") {
    return <Navigate to={getHomePath(userRole)} replace />
  }

  return children
}

export const MemberRoute = ({ children }) => {
  const { currentUser, userRole } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (userRole !== "member") {
    return <Navigate to={getHomePath(userRole)} replace />
  }

  return children
}

export const OwnerOrTrainerRoute = ({ children }) => {
  const { currentUser, userRole } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (userRole !== "owner" && userRole !== "trainer") {
    return <Navigate to={getHomePath(userRole)} replace />
  }

  return children
}

export const SharedLoggedInRoute = ({ children }) => {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return children
}
