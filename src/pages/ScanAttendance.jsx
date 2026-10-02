import { useState } from "react"
import { collection, getDocs, addDoc, query, where } from "firebase/firestore"
import { db } from "../firebase"
import { Phone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

function ScanAttendance() {
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const cleanPhone = phone.replace(/\D/g, "")
      
      if (cleanPhone.length < 10) {
        setError("Please enter a valid 10-digit phone number.")
        setLoading(false)
        return
      }

      // 1. Fetch all members and search for matching phone number
      const membersSnap = await getDocs(collection(db, "members"))
      const matchedMember = membersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(m => {
          const dbPhone = (m.phone || "").replace(/\D/g, "")
          // Match matching suffixes or prefixes (e.g. 10 digits match)
          return dbPhone.slice(-10) === cleanPhone.slice(-10)
        })

      if (!matchedMember) {
        setError("Member not found. Please contact gym owner.")
        setLoading(false)
        return
      }

      // 2. Check if already checked in today
      const todayStr = new Date().toISOString().split("T")[0]
      const attendanceSnap = await getDocs(
        query(collection(db, "attendance"), where("date", "==", todayStr))
      )
      
      const alreadyCheckedIn = attendanceSnap.docs.some(doc => {
        const data = doc.data()
        return data.memberId === matchedMember.id || 
               (data.memberName && data.memberName.toLowerCase().trim() === matchedMember.name.toLowerCase().trim())
      })

      if (alreadyCheckedIn) {
        setError("Attendance already marked for today.")
        setLoading(false)
        return
      }

      // 3. Mark Present
      const checkInTime = new Date().toLocaleTimeString([], { 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
      })

      await addDoc(collection(db, "attendance"), {
        memberId: matchedMember.id,
        memberName: matchedMember.name,
        phone: matchedMember.phone || phone,
        date: todayStr,
        checkInTime,
        status: "Present",
        method: "Entrance QR"
      })

      setSuccess(`${matchedMember.name} marked present successfully.`)
      setPhone("")

    } catch (err) {
      console.error("Attendance check-in error:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#111111] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* FitTrack Logo */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-extrabold tracking-tight italic select-none">
            <span className="text-white">FIT</span>
            <span className="text-red-600">TRACK</span>
          </h2>
          <div className="w-12 h-1 bg-red-600 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-wide text-white">
            Mark Your Attendance
          </h1>
          <p className="text-xs text-gray-400 mt-1.5 leading-normal">
            Enter your registered mobile number to check in today
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="bg-red-950/45 border border-red-900/60 p-4 rounded-2xl flex items-start gap-3 text-xs text-red-400 mb-6 animate-fadeIn">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed font-semibold">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/45 border border-emerald-900/60 p-4 rounded-2xl flex items-start gap-3 text-xs text-emerald-400 mb-6 animate-fadeIn">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed font-semibold">{success}</p>
          </div>
        )}

        {/* Check-in Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
              <Phone size={16} />
            </span>
            <input
              type="tel"
              placeholder="Registered Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              required
              className="w-full bg-black border border-gray-700 focus:border-red-600 rounded-2xl p-4 pl-11 outline-none text-white transition-all text-sm shadow-inner placeholder:text-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-950/50 disabled:text-gray-500 text-white font-bold p-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/20 active:scale-98 transition-all w-full text-sm"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-gray-500" />
                Validating...
              </>
            ) : (
              "Mark Present"
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center text-[10px] text-gray-500 mt-8 leading-normal">
          Check-in is validated based on your registered membership details.
        </div>
      </div>
      
      {styleTag}
    </div>
  )
}

const styleTag = (
  <style>{`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out forwards;
    }
  `}</style>
)

export default ScanAttendance
