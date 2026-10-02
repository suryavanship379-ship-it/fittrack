import { useEffect, useState } from "react"
import { collection, addDoc, getDocs, doc, getDoc, query, where } from "firebase/firestore"
import { db } from "../firebase"
import { useNavigate } from "react-router-dom"
import { 
  Camera, QrCode, ClipboardList, CheckCircle2, 
  AlertTriangle, X, ShieldAlert, Zap, Calendar, User,
  UserCheck, UserX, Users, Activity
} from "lucide-react"
import QRCode from "qrcode"
import QRScannerModal from "../components/QRScannerModal"

function Attendance() {
  const navigate = useNavigate()

  const [attendance, setAttendance] = useState([])
  const [memberName, setMemberName] = useState("")
  const [date, setDate] = useState("")
  const [status, setStatus] = useState("Present")
  const [totalMembers, setTotalMembers] = useState(0)
  
  // Tab states: "manual" | "gym-qr"
  const [activeTab, setActiveTab] = useState("manual")
  
  // Scanner Modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  
  // Scan result popup state
  const [scanResult, setScanResult] = useState(null)
  
  // Gym QR states
  const [gymQRUrl, setGymQRUrl] = useState("")
  const [entranceQRUrl, setEntranceQRUrl] = useState("")
  const [fullscreenQR, setFullscreenQR] = useState(false)

  const fetchAttendance = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "attendance"))
      const attendanceData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      // Sort attendance records by date descending
      attendanceData.sort((a, b) => new Date(b.date) - new Date(a.date))
      setAttendance(attendanceData)
    } catch (error) {
      console.error("Error fetching attendance:", error)
    }
  }

  const fetchTotalMembers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "members"))
      setTotalMembers(querySnapshot.size)
    } catch (error) {
      console.error("Error fetching total members count:", error)
    }
  }


  // Generate Gym Check-in QR Code
  const generateGymQR = async () => {
    try {
      const gymPayload = JSON.stringify({
        type: "gym-checkin",
        gymId: "fittrack_gym_main",
        gymName: "FitTrack Fitness Studio",
        createdAt: new Date().toISOString()
      })
      
      const url = await QRCode.toDataURL(gymPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: "#B4FF39", // Neon lime green
          light: "#000000" // transparent/black background look
        }
      })
      setGymQRUrl(url)
    } catch (err) {
      console.error("Failed to generate gym QR code:", err)
    }
  }

  // Generate Common Entrance QR Code
  const generateEntranceQR = async () => {
    try {
      const scanUrl = `${window.location.origin}/scan-attendance`
      const url = await QRCode.toDataURL(scanUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#B4FF39", // Neon lime green
          light: "#000000"
        }
      })
      setEntranceQRUrl(url)
    } catch (err) {
      console.error("Failed to generate entrance QR code:", err)
    }
  }

  const handleDownloadQR = () => {
    if (!entranceQRUrl) return
    const link = document.createElement("a")
    link.href = entranceQRUrl
    link.download = "fittrack-entrance-qr.png"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleAddAttendance = async (e) => {
    e.preventDefault()

    await addDoc(collection(db, "attendance"), {
      memberName,
      date,
      status,
      method: "Manual"
    })

    setMemberName("")
    setDate("")
    setStatus("Present")

    fetchAttendance()
  }

  // Triggered when staff scans a member's QR Code Pass
  const handleMemberScanSuccess = async (decodedText) => {
    try {
      let memberId = ""
      let scannedName = ""

      // Attempt parsing JSON payload from member
      try {
        const payload = JSON.parse(decodedText)
        if (payload.type === "member-checkin" && payload.memberId) {
          memberId = payload.memberId
          scannedName = payload.name
        } else {
          // Fallback if plain text contains ID
          memberId = decodedText
        }
      } catch (err) {
        memberId = decodedText
      }

      if (!memberId || memberId.trim() === "") {
        setScanResult({
          type: "error",
          message: "Invalid QR code format scanned."
        })
        return
      }

      // 1. Fetch Member Doc
      const memberDocRef = doc(db, "members", memberId)
      const memberSnap = await getDoc(memberDocRef)

      if (!memberSnap.exists()) {
        setScanResult({
          type: "error",
          message: `No member record found for ID: ${memberId.substring(0, 8)}...`
        })
        return
      }

      const member = memberSnap.data()
      const todayStr = new Date().toISOString().split("T")[0]

      // 2. Check if already checked in today
      const todayAttendance = attendance.find(
        (record) => 
          record.memberName.toLowerCase().trim() === member.name.toLowerCase().trim() && 
          record.date === todayStr
      )

      if (todayAttendance) {
        setScanResult({
          type: "already-marked",
          name: member.name,
          plan: member.plan || "General Training",
          expiry: member.expiry || "None",
          status: member.status || "Active",
          message: "Already checked in for today."
        })
        return
      }

      // 3. Determine if Membership is expired
      const isExpired = member.expiry ? new Date(member.expiry) < new Date(todayStr) : false

      // 4. Create attendance log in Firebase
      await addDoc(collection(db, "attendance"), {
        memberName: member.name,
        date: todayStr,
        status: "Present",
        method: "QR Pass"
      })

      // 5. Update local view list
      fetchAttendance()

      // 6. Set success scan result to display
      setScanResult({
        type: isExpired ? "warning" : "success",
        name: member.name,
        plan: member.plan || "General Training",
        expiry: member.expiry || "N/A",
        status: member.status || "Active",
        message: isExpired 
          ? "Check-in logged, but membership has expired!" 
          : "Member check-in successful!"
      })

    } catch (error) {
      console.error("Error checking in member by QR:", error)
      setScanResult({
        type: "error",
        message: "An error occurred while marking QR attendance: " + error.message
      })
    }
  }

  useEffect(() => {
    fetchAttendance()
    fetchTotalMembers()
    generateGymQR()
    generateEntranceQR()
  }, [])

  // Auto-close scan result popup after 6 seconds
  useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(() => {
        setScanResult(null)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [scanResult])

  const todayStr = new Date().toISOString().split("T")[0]
  
  const presentToday = attendance.filter(
    (item) => item.date === todayStr && item.status === "Present"
  ).length

  const absentToday = attendance.filter(
    (item) => item.date === todayStr && item.status === "Absent"
  ).length

  const totalCheckIns = attendance.length

  const attendanceRate = totalMembers > 0 
    ? Math.round((presentToday / totalMembers) * 100) 
    : 0

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-10">
      {/* Hero Banner Section */}
      <div className="hero-banner">
        <div className="hero-content flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
          <div>
            <span className="hero-tag">Attendance Portal</span>
            <h1 className="hero-title">Gym <span className="text-red-650 text-red-600">Attendance</span></h1>
            <p className="hero-desc">
              Scan QR passes, display check-in terminals, or mark logs manually.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 z-10">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-red-950/20"
            >
              <Camera size={18} />
              Scan Member QR
            </button>
            
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-black/40 hover:bg-black/60 border border-gray-800 text-white px-6 py-3 rounded-xl font-semibold transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Present Today */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Present Today</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{presentToday}</div>
            <div className="stat-trend positive text-emerald-500 text-xs mt-1">
              <span>Active check-ins today</span>
            </div>
          </div>
        </div>

        {/* Absent Today */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Absent Today</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <UserX size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{absentToday}</div>
            <div className="stat-trend negative text-red-500 text-xs mt-1">
              <span>Absent records today</span>
            </div>
          </div>
        </div>

        {/* Total Check-ins */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Check-ins</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <ClipboardList size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{totalCheckIns}</div>
            <div className="stat-trend text-cyan-500 text-xs mt-1">
              <span>All-time check-in logs</span>
            </div>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Attendance Rate</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <Activity size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{attendanceRate}%</div>
            <div className="stat-trend text-lime-500 text-xs mt-1">
              <span>Of {totalMembers} total members</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Selection */}
      <div className="flex border-b border-gray-900 mb-8 gap-1">
        <button
          onClick={() => setActiveTab("manual")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "manual" 
              ? "border-red-600 text-red-500 font-extrabold" 
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Manual Log Form
        </button>
        <button
          onClick={() => setActiveTab("gym-qr")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "gym-qr" 
              ? "border-red-600 text-red-500 font-extrabold" 
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Display Gym Check-In QR
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "manual" ? (
        <form
          onSubmit={handleAddAttendance}
          className="bg-[#111111] p-6 rounded-3xl border border-gray-800 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn"
        >
          <input
            type="text"
            placeholder="Member Name"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            required
            className="bg-black border border-gray-700 rounded-xl p-3 outline-none focus:border-red-650 text-sm text-white"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="bg-black border border-gray-700 rounded-xl p-3 outline-none focus:border-red-650 text-sm text-white"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-black border border-gray-700 rounded-xl p-3 outline-none focus:border-red-650 text-sm text-gray-400 cursor-pointer"
          >
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
          </select>

          <button className="bg-red-600 hover:bg-red-700 rounded-xl font-semibold cursor-pointer text-sm py-3 transition-all active:scale-95">
            Mark Attendance
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 animate-fadeIn">
          {/* Entrance QR Column */}
          <div className="md:col-span-1 bg-[#111111] border border-gray-800 rounded-3xl p-6 flex flex-col items-center justify-between text-center min-h-[380px]">
            <div>
              <h3 className="font-bold text-lg mb-2">Entrance Check-In QR</h3>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                Print this QR and place it at gym entrance. Members scan this to mark attendance on their mobile devices by entering their phone number.
              </p>
            </div>
            {entranceQRUrl ? (
              <div className="bg-black p-4 rounded-2xl border border-gray-850 relative group">
                <img 
                  src={entranceQRUrl} 
                  alt="Entrance QR" 
                  className="w-40 h-40 block mx-auto object-contain" 
                />
              </div>
            ) : (
              <div className="w-40 h-40 bg-black rounded-2xl border border-gray-850 flex items-center justify-center text-gray-600 text-xs italic">
                Generating QR...
              </div>
            )}
            <button
              onClick={handleDownloadQR}
              className="mt-5 bg-red-650 hover:bg-red-750 bg-red-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-red-950/20"
            >
              <QrCode size={14} /> Download Entrance QR
            </button>
          </div>

          {/* Member Terminal QR Column */}
          <div className="md:col-span-1 bg-[#111111] border border-gray-800 rounded-3xl p-6 flex flex-col items-center justify-between text-center min-h-[380px]">
            <div>
              <h3 className="font-bold text-lg mb-2">Terminal Self-Check-in QR</h3>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                Display this terminal screen at reception. Members check themselves in by scanning this code using the camera scanner in their dashboard.
              </p>
            </div>
            {gymQRUrl ? (
              <div 
                className="bg-black p-4 rounded-2xl border border-gray-850 cursor-pointer relative group"
                onClick={() => setFullscreenQR(true)}
              >
                <img 
                  src={gymQRUrl} 
                  alt="Terminal QR" 
                  className="w-40 h-40 block mx-auto object-contain transition-opacity group-hover:opacity-80" 
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl text-[9px] text-red-500 font-bold uppercase tracking-wider">
                  Click to Expand
                </div>
              </div>
            ) : (
              <div className="w-40 h-40 bg-black rounded-2xl border border-gray-850 flex items-center justify-center text-gray-600 text-xs italic">
                Generating QR...
              </div>
            )}
            <button
              onClick={() => setFullscreenQR(true)}
              className="mt-5 bg-gray-900 hover:bg-gray-850 border border-gray-850 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Expand Terminal QR
            </button>
          </div>

          {/* Instructions Column */}
          <div className="md:col-span-1 bg-[#111] border border-gray-800 rounded-3xl p-6 flex flex-col justify-center gap-5 min-h-[380px]">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Zap className="text-red-500" size={18} /> QR Entry Methods
            </h3>
            
            <div className="flex flex-col gap-3.5 text-xs text-left">
              <div className="bg-black/40 border border-gray-900 p-3.5 rounded-2xl">
                <span className="text-red-500 font-bold block mb-1">Method A: Entrance QR Printout</span>
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  Members scan the printed QR with any standard mobile camera app, and input their registered phone number.
                </p>
              </div>
              <div className="bg-black/40 border border-gray-900 p-3.5 rounded-2xl">
                <span className="text-red-500 font-bold block mb-1">Method B: Dashboard Terminal</span>
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  Members log in, click "Scan Gym QR", and use our app scanner to instantly check in.
                </p>
              </div>
            </div>

            <div className="bg-black/20 border border-red-950/40 p-3 rounded-2xl text-[11px] text-gray-400 flex items-start gap-2.5">
              <CheckCircle2 className="text-red-500 shrink-0 mt-0.5" size={14} />
              <span>Entrance logs register automatic check-in times and methods inside the ledger.</span>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Gym QR Overlay */}
      {fullscreenQR && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullscreenQR(false)}
        >
          <button 
            className="absolute top-5 right-5 text-gray-400 hover:text-white bg-gray-900 p-3 rounded-full"
            onClick={() => setFullscreenQR(false)}
          >
            <X size={24} />
          </button>
          
          <div className="text-center max-w-md">
            <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-2">
              FitTrack Check-In
            </h2>
            <p className="text-xs text-gray-500 mb-8">
              Scan this code with your Member Dashboard to register today's attendance
            </p>
            <div className="bg-white p-6 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.2)] inline-block">
              <img src={gymQRUrl} alt="Gym Check-in QR Full" className="w-72 h-72 md:w-96 md:h-96 object-contain block" />
            </div>
            <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-6 animate-pulse">
              Click anywhere to close
            </p>
          </div>
        </div>
      )}

      {/* Attendance Log Table */}
      <div className="bg-[#111111] rounded-3xl border border-gray-800 overflow-hidden">
        <div className="bg-[#1a1a1a] p-5 border-b border-gray-850 flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ClipboardList size={18} className="text-red-500" /> Attendance Ledger
          </h3>
          <span className="text-xs text-gray-400 bg-black/60 px-3 py-1 rounded-full border border-gray-850">
            Total Logs: {attendance.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#151515] text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-850">
              <tr>
                <th className="p-5 text-left">Member Name</th>
                <th className="p-5 text-left">Date</th>
                <th className="p-5 text-left">Method</th>
                <th className="p-5 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-gray-500 text-xs italic">
                    No attendance logs logged yet for today or previous dates.
                  </td>
                </tr>
              ) : (
                attendance.map((item) => (
                  <tr key={item.id} className="border-t border-gray-900 hover:bg-white/2 transition-colors">
                    <td className="p-5 font-semibold text-white">{item.memberName}</td>
                    <td className="p-5 text-gray-400 text-sm">{item.date}</td>
                    <td className="p-5 text-xs">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${
                        item.method === "QR Pass" 
                          ? "bg-red-950/60 text-red-400 border-red-900" 
                          : item.method === "Self Check-in" 
                          ? "bg-cyan-950/60 text-cyan-400 border-cyan-900"
                          : "bg-gray-900 text-gray-400 border-gray-800"
                      }`}>
                        {item.method || "Manual"}
                      </span>
                    </td>
                    <td className="p-5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase border ${
                          item.status === "Present"
                            ? "bg-emerald-950/80 text-emerald-400 border-emerald-900"
                            : "bg-red-950/80 text-red-400 border-red-900"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Scanner Modal component */}
      <QRScannerModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleMemberScanSuccess}
      />

      {/* Floating Scan Alert Notifications */}
      {scanResult && (
        <div className="fixed bottom-5 right-5 z-50 animate-fadeIn max-w-sm w-full bg-[#111111]/90 backdrop-blur-md border border-gray-800 shadow-2xl rounded-2xl overflow-hidden">
          <div className="p-4 flex gap-3.5">
            {scanResult.type === "success" && (
              <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-900/60 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                <CheckCircle2 size={20} />
              </div>
            )}
            {scanResult.type === "warning" && (
              <div className="w-10 h-10 rounded-full bg-amber-950/60 border border-amber-900/60 flex items-center justify-center text-amber-500 shrink-0 mt-0.5 animate-pulse">
                <AlertTriangle size={20} />
              </div>
            )}
            {scanResult.type === "already-marked" && (
              <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-900/60 flex items-center justify-center text-cyan-500 shrink-0 mt-0.5">
                <Zap size={20} />
              </div>
            )}
            {scanResult.type === "error" && (
              <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-900/60 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
                <ShieldAlert size={20} />
              </div>
            )}

            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                  {scanResult.type === "success" && "Check-in Confirmed"}
                  {scanResult.type === "warning" && "Membership Expired"}
                  {scanResult.type === "already-marked" && "Already Marked"}
                  {scanResult.type === "error" && "Error Scanning"}
                </h4>
                <button 
                  onClick={() => setScanResult(null)}
                  className="text-gray-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              {scanResult.name ? (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-white leading-tight">
                    {scanResult.name}
                  </span>
                  
                  <div className="flex flex-col text-[10px] text-gray-400 mt-1 gap-0.5">
                    <span>Plan: <strong className="text-gray-200">{scanResult.plan}</strong></span>
                    <span>Expiry: <strong className={scanResult.type === "warning" ? "text-amber-500 font-bold" : "text-gray-200"}>{scanResult.expiry}</strong></span>
                  </div>
                </div>
              ) : null}

              <p className="text-xs text-gray-400 mt-1 leading-normal">
                {scanResult.message}
              </p>
            </div>
          </div>
          
          {/* Visual Alert Progress Bar */}
          <div className="h-1 bg-gray-900 w-full overflow-hidden">
            <div 
              className={`h-full animate-progress ${
                scanResult.type === "success" 
                  ? "bg-emerald-500" 
                  : scanResult.type === "warning" 
                  ? "bg-amber-500" 
                  : scanResult.type === "already-marked"
                  ? "bg-cyan-500"
                  : "bg-red-500"
              }`}
            />
          </div>
        </div>
      )}

      {/* Embedded Alert CSS */}
      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-progress {
          animation: progress 6s linear forwards;
        }
      `}</style>
    </div>
  )
}

export default Attendance
