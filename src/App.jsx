import { BrowserRouter, Routes, Route } from "react-router-dom"

import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Members from "./pages/Members"
import Attendance from "./pages/Attendance"
import Layout from "./components/Layout"
import Payments from "./pages/Payments"
import WorkoutPlans from "./pages/WorkoutPlans"
import Trainers from "./pages/Trainers"
import Reports from "./pages/Reports"
import Settings from "./pages/Settings"
import MemberProfile from "./pages/MemberProfile"
import TrainerProfile from "./pages/TrainerProfile"
import WorkoutPlanDetail from "./pages/WorkoutPlanDetail"
import Gallery from "./pages/Gallery"
import ScanAttendance from "./pages/ScanAttendance"

import TrainerDashboard from "./pages/TrainerDashboard"
import MemberDashboard from "./pages/MemberDashboard"
import { AuthProvider } from "./context/AuthContext"
import { 
  OwnerRoute, 
  TrainerRoute, 
  MemberRoute, 
  OwnerOrTrainerRoute, 
  SharedLoggedInRoute 
} from "./components/ProtectedRoutes"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/scan-attendance" element={<ScanAttendance />} />

          {/* Owner Only Routes */}
          <Route path="/dashboard" element={<OwnerRoute><Layout><Dashboard /></Layout></OwnerRoute>} />
          <Route path="/members" element={<OwnerRoute><Layout><Members /></Layout></OwnerRoute>} />
          <Route path="/attendance" element={<OwnerRoute><Layout><Attendance /></Layout></OwnerRoute>} />
          <Route path="/trainers" element={<OwnerRoute><Layout><Trainers /></Layout></OwnerRoute>} />
          <Route path="/reports" element={<OwnerRoute><Layout><Reports /></Layout></OwnerRoute>} />
          <Route path="/settings" element={<OwnerRoute><Layout><Settings /></Layout></OwnerRoute>} />
          <Route path="/payments" element={<OwnerRoute><Layout><Payments /></Layout></OwnerRoute>} />

          {/* Trainer Only Routes */}
          <Route path="/trainer-dashboard" element={<TrainerRoute><Layout><TrainerDashboard /></Layout></TrainerRoute>} />

          {/* Member Only Routes */}
          <Route path="/member-dashboard" element={<MemberRoute><Layout><MemberDashboard /></Layout></MemberRoute>} />

          {/* Owner & Trainer Shared Routes */}
          <Route path="/workout-plans" element={<OwnerOrTrainerRoute><Layout><WorkoutPlans /></Layout></OwnerOrTrainerRoute>} />
          <Route path="/workout-plans/:id" element={<OwnerOrTrainerRoute><Layout><WorkoutPlanDetail /></Layout></OwnerOrTrainerRoute>} />
          <Route path="/trainers/:id" element={<OwnerOrTrainerRoute><Layout><TrainerProfile /></Layout></OwnerOrTrainerRoute>} />

          {/* Shared Logged-in Routes (page-level role checks applied inside) */}
          <Route path="/members/:id" element={<SharedLoggedInRoute><Layout><MemberProfile /></Layout></SharedLoggedInRoute>} />
          <Route path="/gallery" element={<SharedLoggedInRoute><Layout><Gallery /></Layout></SharedLoggedInRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App