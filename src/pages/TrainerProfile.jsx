import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { 
  User, Phone, Award, Briefcase, Clock, IndianRupee, Shield, 
  ChevronLeft, Edit3, Trash2, Users, ClipboardList, FileText
} from "lucide-react"
import { useAuth } from "../context/AuthContext"

function TrainerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole, roleData } = useAuth()

  const [loading, setLoading] = useState(true)
  const [trainer, setTrainer] = useState(null)
  
  // Relations states
  const [assignedMembers, setAssignedMembers] = useState([])
  const [workoutPlans, setWorkoutPlans] = useState([])

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editExperience, setEditExperience] = useState("")
  const [editAvailability, setEditAvailability] = useState("Full-Time")
  const [editSalary, setEditSalary] = useState("")
  const [editPaymentStatus, setEditPaymentStatus] = useState("Pending")
  const [editSpecializations, setEditSpecializations] = useState([])
  
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)

  const specializationOptions = [
    "Weight Loss",
    "Muscle Gain",
    "Cardio",
    "Personal Training",
    "Yoga",
    "Zumba",
  ]

  const fetchTrainerData = async () => {
    setLoading(true)
    try {
      const docRef = doc(db, "trainers", id)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data()
        setTrainer(data)
        setNotes(data.notes || "")

        // Prep edit states
        setEditName(data.name || "")
        setEditPhone(data.phone || "")
        setEditExperience(data.experience || "")
        setEditAvailability(data.availability || "Full-Time")
        setEditSalary(data.salary || "")
        setEditPaymentStatus(data.paymentStatus || "Pending")
        setEditSpecializations(data.specializations || [])

        // Fetch members and workout plans to find connections
        const [membersSnap, plansSnap] = await Promise.all([
          getDocs(collection(db, "members")),
          getDocs(collection(db, "workout_plans"))
        ])

        const trainerName = data.name || ""
        const membersData = membersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(m => (m.assignedTrainer || "").toLowerCase().trim() === trainerName.toLowerCase().trim())
        
        const plansData = plansSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => (p.trainerName || "").toLowerCase().trim() === trainerName.toLowerCase().trim())

        setAssignedMembers(membersData)
        setWorkoutPlans(plansData)
      } else {
        alert("Trainer not found.")
        navigate(userRole === "owner" ? "/trainers" : "/trainer-dashboard")
      }
    } catch (error) {
      console.error("Error loading trainer: ", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userRole === "member") {
      navigate("/member-dashboard", { replace: true })
      return
    }
    if (userRole === "trainer" && roleData?.id !== id) {
      navigate("/trainer-dashboard", { replace: true })
      return
    }
    fetchTrainerData()
  }, [id, userRole, roleData])

  const handleBackClick = () => {
    if (userRole === "owner") {
      navigate("/trainers")
    } else {
      navigate("/trainer-dashboard")
    }
  }

  const getBackText = () => {
    if (userRole === "owner") return "Back to Trainers"
    return "Back to Dashboard"
  }


  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      const docRef = doc(db, "trainers", id)
      await updateDoc(docRef, {
        name: editName,
        phone: editPhone,
        experience: editExperience,
        availability: editAvailability,
        salary: Number(editSalary),
        paymentStatus: editPaymentStatus,
        specializations: editSpecializations
      })
      setShowEditModal(false)
      fetchTrainerData()
    } catch (error) {
      console.error("Error updating trainer: ", error)
      alert("Failed to update profile.")
    }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      const docRef = doc(db, "trainers", id)
      await updateDoc(docRef, { notes })
      alert("Notes saved successfully!")
    } catch (error) {
      console.error("Error saving notes: ", error)
      alert("Failed to save notes.")
    } finally {
      setSavingNotes(false)
    }
  }

  const handleSpecializationToggle = (spec) => {
    setEditSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((item) => item !== spec) : [...prev, spec]
    )
  }

  const handleDeleteTrainer = async () => {
    if (window.confirm("Are you sure you want to delete this trainer profile?")) {
      try {
        await deleteDoc(doc(db, "trainers", id))
        navigate("/trainers")
      } catch (error) {
        console.error("Error deleting trainer: ", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center gap-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm">Fetching trainer profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 animate-fadeIn">
      
      {/* Back Button */}
      <button 
        onClick={handleBackClick}
        className="flex items-center gap-2 text-gray-400 hover:text-red-500 text-sm font-semibold mb-6 transition-colors cursor-pointer"
      >
        <ChevronLeft size={16} /> {getBackText()}
      </button>

      {/* Profile Header Grid */}
      <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-red-950/45 border-2 border-red-650 flex items-center justify-center text-red-500 shrink-0">
            <User size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-wide">{trainer.name}</h1>
            <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
              <Phone size={14} className="text-red-500" /> {trainer.phone || "N/A"}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {trainer.specializations && trainer.specializations.map((spec) => (
                <span 
                  key={spec}
                  className="text-[9px] font-bold uppercase tracking-wider bg-red-950/40 text-red-500 border border-red-900/60 px-2.5 py-0.5 rounded-full"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        {userRole === "owner" && (
          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            <button 
              onClick={() => setShowEditModal(true)}
              className="flex-1 md:flex-initial bg-gray-900 hover:bg-gray-850 border border-gray-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Edit3 size={14} /> Edit Trainer
            </button>
            <button 
              onClick={handleDeleteTrainer}
              className="flex-1 md:flex-initial bg-red-950/20 hover:bg-red-950/45 text-red-500 border border-red-900/60 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Trash2 size={14} /> Delete Profile
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: STAFF STATS */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-5 flex items-center gap-2">
              <Briefcase className="text-red-500" size={18} /> Staff Details
            </h2>
            <div className="flex flex-col gap-4 text-sm">
              <div className="bg-black/40 border border-gray-900 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-2">
                  <Award size={16} className="text-red-500" /> Experience
                </span>
                <strong className="text-white">{trainer.experience} Years</strong>
              </div>
              <div className="bg-black/40 border border-gray-900 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-2">
                  <Clock size={16} className="text-red-500" /> Availability / Shift
                </span>
                <strong className="text-white">{trainer.availability}</strong>
              </div>
              <div className="bg-black/40 border border-gray-900 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-2">
                  <IndianRupee size={16} className="text-red-500" /> Monthly Salary
                </span>
                <strong className="text-white">₹{Number(trainer.salary).toLocaleString()}</strong>
              </div>
              <div className="bg-black/40 border border-gray-900 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-2">
                  <Shield size={16} className="text-red-500" /> Salary Status
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  trainer.paymentStatus === "Paid"
                    ? "bg-emerald-950/80 text-emerald-400 border-emerald-900"
                    : "bg-amber-950/80 text-amber-400 border-amber-900"
                }`}>
                  {trainer.paymentStatus || "Pending"}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ASSIGNED MEMBERS & CREATED PLANS */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Assigned Members */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <Users className="text-red-500" size={18} /> Assigned Members ({assignedMembers.length})
            </h2>
            {assignedMembers.length === 0 ? (
              <div className="p-6 text-center text-gray-600 text-xs italic">No members assigned to this trainer yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[220px] overflow-y-auto pr-1">
                {assignedMembers.map(m => (
                  <div 
                    key={m.id}
                    onClick={() => navigate(`/members/${m.id}`)}
                    className="bg-black border border-gray-850 hover:border-red-900/40 p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all"
                  >
                    <div>
                      <strong className="text-sm text-white block">{m.name}</strong>
                      <span className="text-xs text-gray-500 block mt-1">Plan: {m.plan}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workout Plans Designed */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <ClipboardList className="text-red-500" size={18} /> Workout Programs Created ({workoutPlans.length})
            </h2>
            {workoutPlans.length === 0 ? (
              <div className="p-6 text-center text-gray-600 text-xs italic">No workout plans created by this trainer yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[220px] overflow-y-auto pr-1">
                {workoutPlans.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => navigate(`/workout-plans/${p.id}`)}
                    className="bg-black border border-gray-850 hover:border-red-900/40 p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all"
                  >
                    <div>
                      <strong className="text-sm text-white block">{p.planName}</strong>
                      <span className="text-xs text-gray-500 block mt-1">Goal: {p.goal} • Member: {p.memberName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes Log */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-850 pb-3 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="text-red-500" size={18} /> Staff / Trainer Notes
              </h2>
              <button 
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="bg-red-650 hover:bg-red-700 disabled:bg-red-800 text-xs font-semibold px-4 py-1.5 rounded-xl cursor-pointer text-white transition-colors"
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
            <textarea
              placeholder="Record trainer specialization details, work schedule notes, salary adjustments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="4"
              className="w-full bg-black border border-gray-850 rounded-2xl p-4 outline-none focus:border-red-650 text-sm text-white resize-none leading-relaxed"
            />
          </div>

        </div>

      </div>

      {/* EDIT TRAINER DETAILS MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveProfile}
            className="bg-[#111111] border border-gray-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800 bg-[#151515] flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="text-red-650" size={20} /> Edit Trainer Profile
              </h2>
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white font-semibold text-sm cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-bold uppercase">Trainer Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Experience (Years)</label>
                  <input
                    type="number"
                    value={editExperience}
                    onChange={(e) => setEditExperience(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Availability</label>
                  <select
                    value={editAvailability}
                    onChange={(e) => setEditAvailability(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white cursor-pointer"
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Salary (₹)</label>
                  <input
                    type="number"
                    value={editSalary}
                    onChange={(e) => setEditSalary(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Salary Status</label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white cursor-pointer"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Specializations selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-500 font-bold uppercase">Specializations</label>
                <div className="grid grid-cols-2 gap-2 bg-black border border-gray-800 p-3 rounded-2xl">
                  {specializationOptions.map((spec) => (
                    <label key={spec} className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editSpecializations.includes(spec)}
                        onChange={() => handleSpecializationToggle(spec)}
                        className="rounded border-gray-850 bg-black text-red-600 focus:ring-red-650 shrink-0 cursor-pointer"
                      />
                      {spec}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-800 bg-[#151515] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="bg-gray-800 hover:bg-gray-700 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer text-white"
              >
                Save Details
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}

export default TrainerProfile
