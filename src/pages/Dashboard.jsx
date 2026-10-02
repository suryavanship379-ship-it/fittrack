import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "../firebase"
import {
  Users,
  Plus,
  TrendingUp,
  Activity,
  DollarSign,
  Calendar,
  Clock
} from "lucide-react"
import "./Dashboard.css"

const Dashboard = () => {
  const navigate = useNavigate()

  const [totalMembers, setTotalMembers] = useState(0)
  const [activeMembers, setActiveMembers] = useState(0)
  const [pendingFees, setPendingFees] = useState(0)
  const [revenue, setRevenue] = useState(0)
  const [todayAttendanceCount, setTodayAttendanceCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRealDashboardData = async () => {
      setLoading(true)
      try {
        // Fetch Real Members from Firestore
        const membersSnap = await getDocs(collection(db, "members"))
        const membersData = membersSnap.docs.map(d => d.data())
        setTotalMembers(membersData.length)

        const activeCount = membersData.filter(m => m.status === "Active" || !m.status).length
        setActiveMembers(activeCount)

        // Fetch Real Payments from Firestore
        const paymentsSnap = await getDocs(collection(db, "payments"))
        const paymentsData = paymentsSnap.docs.map(d => d.data())
        
        const paidTotal = paymentsData
          .filter(p => p.status === "Paid")
          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
        setRevenue(paidTotal)

        const pendingTotal = paymentsData
          .filter(p => p.status === "Pending")
          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
        setPendingFees(pendingTotal)

        // Fetch Today's Attendance from Firestore
        const todayStr = new Date().toISOString().split("T")[0]
        try {
          const attendanceQuery = query(collection(db, "attendance"), where("date", "==", todayStr))
          const attendanceSnap = await getDocs(attendanceQuery)
          setTodayAttendanceCount(attendanceSnap.docs.length)
        } catch (attErr) {
          console.warn("Attendance query notice:", attErr)
        }
      } catch (error) {
        console.error("Error loading dashboard data from Firestore:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRealDashboardData()
  }, [])

  return (
    <div className="dashboard-container">

      {/* Hero Banner */}
      <section className="hero-banner">
        <div className="hero-content">
          <span className="hero-tag">FitTrack SaaS Management</span>
          <h1 className="hero-title">Welcome Back, Chief</h1>
          <p className="hero-desc">
            Analyze real-time gym membership metrics, financial ledger summaries, trainer schedules, and daily check-ins.
          </p>
          <button
            className="btn-primary mt-6 hover:scale-105 active:scale-100 transition-all cursor-pointer flex items-center gap-2"
            onClick={() => navigate("/members")}
          >
            <Plus size={18} /> Add New Member
          </button>
        </div>
      </section>

      {/* Stats Cards Row */}
      <section className="stats-grid animate-fadeIn">
        
        {/* Total Members */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Members</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{totalMembers}</div>
            <div className="stat-trend positive text-emerald-500 text-xs mt-1">
              <span>Real Firestore Member Records</span>
            </div>
          </div>
        </div>

        {/* Active Members */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Active Members</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-950/20 border border-emerald-900/30 text-emerald-400">
              <Activity size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-emerald-400">{activeMembers}</div>
            <div className="stat-trend positive text-emerald-400 text-xs mt-1">
              <span>{totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0}% active ratio</span>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">₹{revenue.toLocaleString()}</div>
            <div className="stat-trend positive text-emerald-500 text-xs mt-1">
              <span>Paid ledger receipts</span>
            </div>
          </div>
        </div>

        {/* Today Attendance */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Today's Attendance</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <Calendar size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{todayAttendanceCount}</div>
            <div className="stat-trend positive text-emerald-500 text-xs mt-1">
              <span>Check-in scans today</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  )
}

export default Dashboard