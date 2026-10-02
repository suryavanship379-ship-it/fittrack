import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { db } from "../firebase"
import { collection, getDocs, addDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import { 
  User, Calendar, CreditCard, Dumbbell, Apple, 
  CalendarCheck, Info, Sparkles, Phone, Award,
  QrCode, Scan, CheckCircle2, AlertTriangle, X
} from "lucide-react"
import QRCode from "qrcode"
import QRScannerModal from "../components/QRScannerModal"

function MemberDashboard() {
  const { roleData } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [trainerData, setTrainerData] = useState(null)
  const [workoutPlan, setWorkoutPlan] = useState(null)
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [paymentRecords, setPaymentRecords] = useState([])
  const [galleryPhotos, setGalleryPhotos] = useState([])

  // QR Check-in & Pass states
  const [qrTab, setQrTab] = useState("pass")
  const [memberQRUrl, setMemberQRUrl] = useState("")
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [selfScanResult, setSelfScanResult] = useState(null)

  useEffect(() => {
    if (!roleData || !roleData.id) return
    const payload = JSON.stringify({
      type: "member-checkin",
      memberId: roleData.id,
      name: roleData.name || "Member"
    })
    QRCode.toDataURL(payload, {
      width: 250,
      margin: 1,
      color: {
        dark: "#B4FF39", // Neon lime green
        light: "#111111"
      }
    })
      .then(url => setMemberQRUrl(url))
      .catch(err => console.error("Error generating member QR Pass:", err))
  }, [roleData])

  const handleGymScanSuccess = async (decodedText) => {
    try {
      let gymId = ""
      let gymName = "FitTrack Gym"

      try {
        const payload = JSON.parse(decodedText)
        if (payload.type === "gym-checkin") {
          gymId = payload.gymId
          gymName = payload.gymName || "FitTrack Gym"
        } else {
          setSelfScanResult({
            type: "error",
            message: "Invalid QR code scanned. Make sure it's the Gym Check-in QR."
          })
          return
        }
      } catch (err) {
        setSelfScanResult({
          type: "error",
          message: "Unsupported QR code format."
        })
        return
      }

      const todayStr = new Date().toISOString().split("T")[0]
      const memberName = roleData?.name || "Athlete"

      // Check if already checked in today
      const alreadyCheckedIn = attendanceRecords.some(r => r.date === todayStr)

      if (alreadyCheckedIn) {
        setSelfScanResult({
          type: "already",
          message: "You have already checked in for today!"
        })
        return
      }

      // Add to attendance database
      await addDoc(collection(db, "attendance"), {
        memberName,
        date: todayStr,
        status: "Present",
        method: "Self Check-in"
      })

      // Refresh dashboard data
      fetchMemberDashboardData()

      setSelfScanResult({
        type: "success",
        message: `Successfully checked into ${gymName}!`
      })

    } catch (error) {
      console.error("Self check-in failed:", error)
      setSelfScanResult({
        type: "error",
        message: "Failed to process self check-in: " + error.message
      })
    }
  }

  // Clear self scan notification
  useEffect(() => {
    if (selfScanResult) {
      const timer = setTimeout(() => {
        setSelfScanResult(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [selfScanResult])

  const fetchMemberDashboardData = async () => {
    if (!roleData || !roleData.name) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const memberName = roleData.name

      const [trainersSnap, plansSnap, attendanceSnap, paymentsSnap, gallerySnap] = await Promise.all([
        getDocs(collection(db, "trainers")),
        getDocs(collection(db, "workout_plans")),
        getDocs(collection(db, "attendance")),
        getDocs(collection(db, "payments")),
        getDocs(collection(db, "gallery"))
      ])

      const assignedTrainerName = roleData.assignedTrainer || ""
      const trainer = trainersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(t => (t.name || "").toLowerCase().trim() === assignedTrainerName.toLowerCase().trim())
      setTrainerData(trainer || null)

      const plan = plansSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(p => (p.memberName || "").toLowerCase().trim() === memberName.toLowerCase().trim())
      setWorkoutPlan(plan || null)

      const attendance = attendanceSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => (a.memberName || "").toLowerCase().trim() === memberName.toLowerCase().trim())
        .sort((a, b) => new Date(b.date) - new Date(a.date))
      setAttendanceRecords(attendance)

      const payments = paymentsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => (p.memberName || "").toLowerCase().trim() === memberName.toLowerCase().trim())
        .sort((a, b) => new Date(b.paymentDate || b.date || "") - new Date(a.paymentDate || a.date || ""))
      setPaymentRecords(payments)

      const photos = gallerySnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setGalleryPhotos(photos.slice(0, 6))

    } catch (error) {
      console.error("Error loading member dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMemberDashboardData()
  }, [roleData])

  const getExpiryStatus = (expiryDateStr) => {
    if (!expiryDateStr) {
      return {
        text: "No Plan",
        badgeClass: "bg-red-950/80 text-red-400 border border-red-900",
        type: "expired",
        daysRemaining: 0
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiryDate = new Date(expiryDateStr)
    expiryDate.setHours(0, 0, 0, 0)

    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return {
        text: "Expired",
        badgeClass: "bg-red-950/80 text-red-400 border border-red-900",
        type: "expired",
        daysRemaining: diffDays
      }
    } else if (diffDays <= 5) {
      return {
        text: `Expiring in ${diffDays} Days`,
        badgeClass: "bg-amber-950/80 text-amber-400 border border-amber-900/60",
        type: "expiring_soon",
        daysRemaining: diffDays
      }
    } else {
      return {
        text: `Active (${diffDays} Days Left)`,
        badgeClass: "bg-emerald-950/80 text-emerald-400 border border-emerald-900",
        type: "active",
        daysRemaining: diffDays
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center gap-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm">Loading your gym dashboard...</p>
      </div>
    )
  }

  const expiryInfo = getExpiryStatus(roleData?.expiry)
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 animate-fadeIn">
      {/* Welcome Header */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            Member <span className="text-red-600 font-black">Dashboard</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            Welcome back, {roleData?.name || "Athlete"}. Let's crush your goals today!
          </p>
        </div>
        {roleData?.expiry && (
          <span className={`text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl border ${expiryInfo.badgeClass}`}>
            Membership: {expiryInfo.text}
          </span>
        )}
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLUMNS */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Membership Info & Warnings */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Current Membership</span>
              <h3 className="text-2xl font-black text-white">{roleData?.plan || "No Plan Registered"}</h3>
              <p className="text-gray-400 text-sm">
                Expires on: <span className="text-white font-semibold">{roleData?.expiry || "N/A"}</span>
              </p>
            </div>
            
            {expiryInfo.type !== "active" && (
              <div className="bg-red-950/30 border border-red-900/40 p-4 rounded-2xl flex items-start gap-3 md:max-w-xs shrink-0">
                <Info className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div className="text-xs">
                  <strong className="text-red-400 block mb-1">Renewal Required</strong>
                  <span className="text-gray-400 leading-relaxed">
                    Your membership is expired or expiring soon. Please contact the front desk or owner to renew.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Workout Routine & Schedule */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <Dumbbell className="text-red-500" size={18} /> Weekly Workout Plan
            </h2>
            {workoutPlan ? (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-black/40 border border-gray-900 p-4 rounded-2xl">
                  <div>
                    <strong className="text-sm text-white block">{workoutPlan.planName}</strong>
                    <span className="text-xs text-gray-500 block mt-1">Goal: {workoutPlan.goal}</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-[#151515] border border-gray-800 px-3 py-1 rounded-lg">
                    {workoutPlan.startDate} to {workoutPlan.endDate}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="bg-black border border-gray-850 p-3.5 rounded-2xl flex flex-col gap-1 text-xs">
                      <span className="text-red-500 font-bold uppercase tracking-wider text-[10px]">{day}</span>
                      <strong className="text-white text-sm mt-0.5 font-bold line-clamp-2">
                        {workoutPlan.schedule?.[day] || "Rest Day"}
                      </strong>
                    </div>
                  ))}
                </div>

                {workoutPlan.dietNotes && (
                  <div className="bg-black/20 border border-gray-900 p-4 rounded-2xl mt-2">
                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Apple size={14} /> Diet & Nutrition Guide
                    </h4>
                    <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">{workoutPlan.dietNotes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center text-gray-500 text-sm italic">
                No active workout routine found. Ask your trainer to assign a routine!
              </div>
            )}
          </div>

          {/* Payment Ledger */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <CreditCard className="text-red-500" size={18} /> Payment Receipts
            </h2>
            {paymentRecords.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm italic">No payment transactions recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="py-3 font-semibold">Amount</th>
                      <th className="py-3 font-semibold">Payment Date</th>
                      <th className="py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRecords.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-900/50 hover:bg-black/10">
                        <td className="py-3 font-bold text-white">₹{Number(payment.amount).toLocaleString()}</td>
                        <td className="py-3 text-gray-400">{payment.paymentDate || payment.date}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase border ${
                            payment.status === "Paid"
                              ? "bg-emerald-950/80 text-emerald-400 border-emerald-900"
                              : "bg-amber-950/80 text-amber-400 border-amber-900"
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Gym Gallery Preview */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-850 pb-3 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="text-red-500" size={18} /> Gym Feed & Photostream
              </h2>
              <button 
                onClick={() => navigate("/gallery")}
                className="text-xs text-red-500 font-bold hover:underline"
              >
                View Full Gallery →
              </button>
            </div>
            {galleryPhotos.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm italic">No gallery posts yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {galleryPhotos.map((photo) => (
                  <div key={photo.id} className="aspect-video bg-black rounded-2xl overflow-hidden border border-gray-900 group relative">
                    <img 
                      src={photo.url} 
                      alt="Gym upload" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                      onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300" }}
                    />
                    {photo.caption && (
                      <span className="absolute bottom-2 left-2 right-2 truncate bg-black/75 px-2 py-0.5 rounded text-[9px] text-gray-200">
                        {photo.caption}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          
          {/* QR Check-in & Pass Card */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl flex flex-col animate-fadeIn">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <QrCode className="text-red-500" size={18} /> Gym QR Pass & Check-In
            </h2>
            
            {/* Tab selector inside card */}
            <div className="flex bg-black/40 border border-gray-900 rounded-xl p-1 mb-4 text-xs gap-1">
              <button
                onClick={() => setQrTab("pass")}
                className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer ${
                  qrTab === "pass"
                    ? "bg-red-650 text-white shadow font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                My QR Pass
              </button>
              <button
                onClick={() => setQrTab("scan")}
                className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer ${
                  qrTab === "scan"
                    ? "bg-red-650 text-white shadow font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Scan Gym QR
              </button>
            </div>

            {/* Tab content */}
            {qrTab === "pass" ? (
              <div className="flex flex-col items-center justify-center p-2 text-center animate-fadeIn">
                {memberQRUrl ? (
                  <div className="bg-black p-3 rounded-2xl border border-gray-850 shadow-inner flex items-center justify-center mb-4">
                    <img 
                      src={memberQRUrl} 
                      alt="My Check-in QR Pass" 
                      className="w-44 h-44 object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="w-44 h-44 bg-black/50 border border-gray-900 rounded-2xl flex items-center justify-center text-gray-500 text-xs italic mb-4">
                    Generating pass...
                  </div>
                )}
                <p className="text-[11px] text-gray-400 max-w-[220px] leading-relaxed">
                  Show this QR code to the gym staff at the reception desk to check in.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center gap-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-red-950/20 border border-red-900/40 flex items-center justify-center text-red-500">
                  <Scan size={26} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Check In Yourself</h4>
                  <p className="text-[11px] text-gray-400 max-w-[200px] leading-relaxed mx-auto">
                    Scan the daily QR Code displayed at the front counter to instantly check into the gym.
                  </p>
                </div>
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer w-full transition-all active:scale-95 shadow-md shadow-red-950/20"
                >
                  Open Scanner Camera
                </button>
              </div>
            )}
          </div>

          {/* Member Profile Metrics */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <User className="text-red-500" size={18} /> Profile Metrics
            </h2>
            <div className="flex flex-col gap-3">
              <div className="bg-black/40 border border-gray-900 p-3 rounded-2xl flex justify-between items-center text-xs">
                <span className="text-gray-400 font-semibold">Goal Focus</span>
                <span className="text-red-500 font-bold uppercase tracking-wider">{roleData?.goal || "General Fitness"}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/40 border border-gray-900 p-3 rounded-2xl text-center flex flex-col gap-1">
                  <span className="text-gray-500 text-[10px] uppercase font-bold">Age</span>
                  <strong className="text-sm text-white">{roleData?.age || "N/A"}</strong>
                </div>
                <div className="bg-black/40 border border-gray-900 p-3 rounded-2xl text-center flex flex-col gap-1">
                  <span className="text-gray-500 text-[10px] uppercase font-bold">Height</span>
                  <strong className="text-sm text-white">{roleData?.height ? `${roleData.height} cm` : "N/A"}</strong>
                </div>
                <div className="bg-black/40 border border-gray-900 p-3 rounded-2xl text-center flex flex-col gap-1">
                  <span className="text-gray-500 text-[10px] uppercase font-bold">Weight</span>
                  <strong className="text-sm text-white">{roleData?.weight ? `${roleData.weight} kg` : "N/A"}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Trainer */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <Award className="text-red-500" size={18} /> Assigned Trainer
            </h2>
            {roleData?.assignedTrainer ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-red-950/30 border border-red-900/50 flex items-center justify-center text-red-500 shrink-0">
                    <User size={22} />
                  </div>
                  <div>
                    <strong className="text-sm text-white block">{roleData.assignedTrainer}</strong>
                    <span className="text-xs text-gray-500 block mt-0.5">Personal Gym Coach</span>
                  </div>
                </div>
                
                {trainerData && (
                  <div className="border-t border-gray-900/80 pt-3 flex flex-col gap-2.5 text-xs">
                    {trainerData.phone && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone size={14} className="text-red-500 shrink-0" />
                        <span>{trainerData.phone}</span>
                      </div>
                    )}
                    {trainerData.availability && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar size={14} className="text-red-500 shrink-0" />
                        <span>Shift: {trainerData.availability}</span>
                      </div>
                    )}
                    {trainerData.specializations && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {trainerData.specializations.map((spec) => (
                          <span key={spec} className="text-[8px] bg-red-950/25 text-red-500 border border-red-900/30 px-2 py-0.5 rounded">
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-600 text-xs italic">
                No personal trainer assigned. Contact the gym office to choose a coach!
              </div>
            )}
          </div>

          {/* Attendance History */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <CalendarCheck className="text-red-500" size={18} /> My Attendance Logs ({attendanceRecords.length})
            </h2>
            {attendanceRecords.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs italic">No attendance marked yet.</div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {attendanceRecords.slice(0, 10).map((record) => (
                  <div key={record.id} className="bg-black border border-gray-850 p-3 rounded-2xl flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-semibold">{record.date}</span>
                    <span className={`font-semibold px-2 py-0.5 rounded uppercase text-[9px] border ${
                      record.status === "Present" 
                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-900" 
                        : "bg-red-950/85 text-red-400 border-red-900"
                    }`}>
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gym Announcements */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <Info className="text-red-500" size={18} /> Gym Announcements
            </h2>
            <div className="flex flex-col gap-3.5 text-xs">
              <div className="bg-black/35 border border-gray-900 p-3 rounded-2xl">
                <span className="text-red-500 font-bold uppercase tracking-wider text-[8px] block mb-1">Notice • June 2026</span>
                <strong className="text-white block mb-0.5">Annual Gym Maintenance Closures</strong>
                <p className="text-gray-400 leading-relaxed">
                  The pool area will undergo deep cleaning on Sunday, June 14. Workout floors remain open.
                </p>
              </div>
              <div className="bg-black/35 border border-gray-900 p-3 rounded-2xl">
                <span className="text-red-500 font-bold uppercase tracking-wider text-[8px] block mb-1">Quote of the Day</span>
                <p className="text-gray-300 italic leading-relaxed">
                  "The only bad workout is the one that didn't happen. Crush your limits today!"
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* QR Scanner modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleGymScanSuccess}
      />

      {/* Self Check-in floating alert notifications */}
      {selfScanResult && (
        <div className="fixed bottom-5 right-5 z-50 animate-fadeIn max-w-sm w-full bg-[#111111]/90 backdrop-blur-md border border-gray-800 shadow-2xl rounded-2xl overflow-hidden p-4 flex gap-3.5 border-l-4 border-l-red-600">
          {selfScanResult.type === "success" ? (
            <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-900/60 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
              <CheckCircle2 size={20} />
            </div>
          ) : selfScanResult.type === "already" ? (
            <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-900/60 flex items-center justify-center text-cyan-500 shrink-0 mt-0.5">
              <Info size={20} />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-900/60 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </div>
          )}

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                {selfScanResult.type === "success" && "Check-in Confirmed"}
                {selfScanResult.type === "already" && "Checked In"}
                {selfScanResult.type === "error" && "Scan Error"}
              </h4>
              <button 
                onClick={() => setSelfScanResult(null)}
                className="text-gray-500 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1 leading-normal">
              {selfScanResult.message}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemberDashboard
