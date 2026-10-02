import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { db } from "../firebase"
import { collection, doc, getDocs, updateDoc, addDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import { 
  User, Users, CalendarCheck, ClipboardList, 
  FileText, Award, Clock, ArrowRight,
  Camera, CheckCircle2, AlertTriangle, X, Info, ShieldAlert
} from "lucide-react"
import QRScannerModal from "../components/QRScannerModal"

function TrainerDashboard() {
  const { roleData } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [assignedMembers, setAssignedMembers] = useState([])
  const [workoutPlans, setWorkoutPlans] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)

  // QR Check-in states
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scanResult, setScanResult] = useState(null)

  const handleMemberScanSuccess = async (decodedText) => {
    try {
      let memberId = ""
      try {
        const payload = JSON.parse(decodedText)
        if (payload.type === "member-checkin" && payload.memberId) {
          memberId = payload.memberId
        } else {
          memberId = decodedText
        }
      } catch (e) {
        memberId = decodedText
      }

      if (!memberId || memberId.trim() === "") {
        setScanResult({
          type: "error",
          message: "Invalid QR code format."
        })
        return
      }

      // 1. Fetch Member Doc
      const { getDoc, doc } = await import("firebase/firestore")
      const memberDocRef = doc(db, "members", memberId)
      const memberSnap = await getDoc(memberDocRef)

      if (!memberSnap.exists()) {
        setScanResult({
          type: "error",
          message: "No member found with this ID."
        })
        return
      }

      const member = memberSnap.data()
      const todayStr = new Date().toISOString().split("T")[0]
      const trainerName = roleData?.name || ""

      // 2. Check if already checked in today (across ALL attendance records)
      const querySnapshot = await getDocs(collection(db, "attendance"))
      const todayAttendance = querySnapshot.docs.find(d => {
        const data = d.data()
        return data.memberName.toLowerCase().trim() === member.name.toLowerCase().trim() && data.date === todayStr
      })

      if (todayAttendance) {
        setScanResult({
          type: "already",
          name: member.name,
          plan: member.plan || "General Training",
          expiry: member.expiry || "N/A",
          message: "This client has already checked in today."
        })
        return
      }

      const isExpired = member.expiry ? new Date(member.expiry) < new Date(todayStr) : false
      const isAssigned = member.assignedTrainer && member.assignedTrainer.toLowerCase().trim() === trainerName.toLowerCase().trim()

      // 3. Create attendance log
      await addDoc(collection(db, "attendance"), {
        memberName: member.name,
        date: todayStr,
        status: "Present",
        method: "QR Pass (Trainer)"
      })

      // 4. Refresh Dashboard
      fetchTrainerDashboardData()

      setScanResult({
        type: isExpired ? "warning" : "success",
        name: member.name,
        plan: member.plan || "General Training",
        expiry: member.expiry || "N/A",
        message: isExpired
          ? "Check-in logged, but membership is expired!"
          : isAssigned 
          ? "Check-in confirmed for your client!"
          : `Check-in confirmed (Assigned to: ${member.assignedTrainer || "None"})`
      })

    } catch (error) {
      console.error("Trainer scan failed:", error)
      setScanResult({
        type: "error",
        message: "Failed to mark client attendance: " + error.message
      })
    }
  }

  // Clear scanResult notification
  useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(() => {
        setScanResult(null)
      }, 6500)
      return () => clearTimeout(timer)
    }
  }, [scanResult])

  const fetchTrainerDashboardData = async () => {
    if (!roleData || !roleData.name) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const trainerName = roleData.name
      setNotes(roleData.notes || "")

      const [membersSnap, plansSnap, attendanceSnap] = await Promise.all([
        getDocs(collection(db, "members")),
        getDocs(collection(db, "workout_plans")),
        getDocs(collection(db, "attendance"))
      ])

      const members = membersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => (m.assignedTrainer || "").toLowerCase().trim() === trainerName.toLowerCase().trim())

      const plans = plansSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => (p.trainerName || "").toLowerCase().trim() === trainerName.toLowerCase().trim())

      const memberNames = new Set(members.map(m => (m.name || "").toLowerCase().trim()))
      const attendance = attendanceSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => memberNames.has((a.memberName || "").toLowerCase().trim()))
        .sort((a, b) => new Date(b.date) - new Date(a.date))

      setAssignedMembers(members)
      setWorkoutPlans(plans)
      setAttendanceRecords(attendance.slice(0, 15))
    } catch (error) {
      console.error("Error fetching trainer dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrainerDashboardData()
  }, [roleData])

  const handleSaveNotes = async () => {
    if (!roleData?.id) return
    setSavingNotes(true)
    try {
      const trainerDocRef = doc(db, "trainers", roleData.id)
      await updateDoc(trainerDocRef, { notes })
      alert("Notes saved successfully!")
    } catch (error) {
      console.error("Error saving notes:", error)
      alert("Failed to save notes.")
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center gap-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm">Loading dashboard data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            Trainer <span className="text-red-650 font-black text-red-600">Dashboard</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            Welcome back, {roleData?.name || "Coach"}. Track your clients, schedules, and plans.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-red-950/20 transition-all active:scale-95 text-sm"
          >
            <Camera size={16} /> Scan Client QR
          </button>
        </div>
      </header>

      <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 flex flex-col md:flex-row items-center md:items-stretch gap-6 mb-10 shadow-lg">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-red-950/40 border-2 border-red-600 flex items-center justify-center text-red-500 shrink-0">
          <User size={50} className="md:hidden" />
          <User size={64} className="hidden md:block" />
        </div>
        <div className="flex-1 flex flex-col justify-center text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide">{roleData?.name}</h2>
          <p className="text-gray-400 text-sm mt-1">{roleData?.phone || "No phone registered"}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-3">
            {roleData?.specializations?.map((spec) => (
              <span 
                key={spec}
                className="text-[9px] font-bold uppercase tracking-wider bg-red-950/40 text-red-500 border border-red-900/60 px-2.5 py-0.5 rounded-full"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-row md:flex-col justify-around gap-4 md:border-l border-gray-800 md:pl-8 text-center md:text-left w-full md:w-auto self-center md:self-stretch">
          <div className="flex items-center gap-3">
            <Award className="text-red-500 shrink-0" size={24} />
            <div>
              <span className="text-gray-400 text-xs block">Experience</span>
              <strong className="text-sm text-white">{roleData?.experience || 0} Years</strong>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="text-red-500 shrink-0" size={24} />
            <div>
              <span className="text-gray-400 text-xs block">Shift / Availability</span>
              <strong className="text-sm text-white">{roleData?.availability || "Full-Time"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <Users className="text-red-500" size={18} /> Assigned Members ({assignedMembers.length})
            </h2>
            {assignedMembers.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-sm italic">No members assigned to you yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                {assignedMembers.map(m => (
                  <div 
                    key={m.id}
                    onClick={() => navigate(`/members/${m.id}`)}
                    className="bg-black border border-gray-800 hover:border-red-650 p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all"
                  >
                    <div>
                      <strong className="text-sm text-white block">{m.name}</strong>
                      <span className="text-xs text-gray-500 block mt-1">Goal: {m.goal} • Plan: {m.plan}</span>
                    </div>
                    <ArrowRight className="text-gray-500" size={16} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-850 pb-3 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="text-red-500" size={18} /> Workout Programs Created ({workoutPlans.length})
              </h2>
              <button 
                onClick={() => navigate("/workout-plans")}
                className="bg-red-600 hover:bg-red-700 text-xs font-semibold px-4 py-1.5 rounded-xl text-white transition-colors"
              >
                Create / Manage Plans
              </button>
            </div>
            {workoutPlans.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-sm italic">You haven't created any workout programs yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                {workoutPlans.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => navigate(`/workout-plans/${p.id}`)}
                    className="bg-black border border-gray-800 hover:border-red-650 p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all"
                  >
                    <div>
                      <strong className="text-sm text-white block">{p.planName}</strong>
                      <span className="text-xs text-gray-500 block mt-1">For: {p.memberName} • {p.goal}</span>
                    </div>
                    <ArrowRight className="text-gray-500" size={16} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-8">
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <CalendarCheck className="text-red-500" size={18} /> Attendance (Assigned Clients)
            </h2>
            {attendanceRecords.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs italic">No attendance records found.</div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                {attendanceRecords.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-black border border-gray-800 p-3 rounded-2xl flex justify-between items-center text-xs"
                  >
                    <div>
                      <strong className="text-white block">{item.memberName}</strong>
                      <span className="text-gray-500 text-[10px] mt-0.5 block">{item.date}</span>
                    </div>
                    <span className={`font-semibold px-2.5 py-0.5 rounded-full uppercase text-[9px] border ${
                      item.status === "Present" 
                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-900" 
                        : "bg-red-950/85 text-red-400 border-red-900"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-850 pb-3 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="text-red-500" size={18} /> My Notes
              </h2>
              <button 
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-xs font-semibold px-4 py-1.5 rounded-xl cursor-pointer text-white transition-colors"
              >
                {savingNotes ? "Saving..." : "Save"}
              </button>
            </div>
            <textarea
              placeholder="Record notes about specific clients, schedule changes, exercises to try..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="5"
              className="w-full bg-black border border-gray-800 rounded-2xl p-4 outline-none focus:border-red-600 text-sm text-white resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* QR Scanner modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleMemberScanSuccess}
      />

      {/* Check-in floating alert notifications */}
      {scanResult && (
        <div className="fixed bottom-5 right-5 z-50 animate-fadeIn max-w-sm w-full bg-[#111111]/90 backdrop-blur-md border border-gray-800 shadow-2xl rounded-2xl overflow-hidden p-4 flex gap-3.5 border-l-4 border-l-red-600">
          {scanResult.type === "success" ? (
            <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-900/60 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
              <CheckCircle2 size={20} />
            </div>
          ) : scanResult.type === "warning" ? (
            <div className="w-10 h-10 rounded-full bg-amber-950/60 border border-amber-900/60 flex items-center justify-center text-amber-500 shrink-0 mt-0.5 animate-pulse">
              <AlertTriangle size={20} />
            </div>
          ) : scanResult.type === "already" ? (
            <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-900/60 flex items-center justify-center text-cyan-500 shrink-0 mt-0.5">
              <Info size={20} />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-900/60 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
              <ShieldAlert size={20} />
            </div>
          )}

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                {scanResult.type === "success" && "Check-in Confirmed"}
                {scanResult.type === "warning" && "Membership Expired"}
                {scanResult.type === "already" && "Already Marked"}
                {scanResult.type === "error" && "Scan Error"}
              </h4>
              <button 
                onClick={() => setScanResult(null)}
                className="text-gray-500 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            {scanResult.name && (
              <div className="flex flex-col gap-0.5 mt-1 text-[11px] text-gray-400">
                <span className="text-sm font-bold text-white leading-tight block">{scanResult.name}</span>
                <span>Plan: <strong className="text-gray-200">{scanResult.plan}</strong></span>
                <span>Expiry: <strong className={scanResult.type === "warning" ? "text-amber-500 font-bold" : "text-gray-200"}>{scanResult.expiry}</strong></span>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1 leading-normal">
              {scanResult.message}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainerDashboard
