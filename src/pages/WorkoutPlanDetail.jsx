import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { 
  ChevronLeft, Dumbbell, Apple, Calendar, Edit3, Trash2, Plus, 
  Users, CheckSquare, Square
} from "lucide-react"
import { useAuth } from "../context/AuthContext"

function WorkoutPlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole, roleData } = useAuth()

  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState(null)
  
  // Settings metadata for dropdown options
  const [members, setMembers] = useState([])

  // Exercise manager state
  const [exercises, setExercises] = useState([])
  const [newExName, setNewExName] = useState("")
  const [newExSets, setNewExSets] = useState("")
  const [newExReps, setNewExReps] = useState("")

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [editPlanName, setEditPlanName] = useState("")
  const [editMemberName, setEditMemberName] = useState("")
  const [editGoal, setEditGoal] = useState("Weight Loss")
  const [editTrainerName, setEditTrainerName] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editDietNotes, setEditDietNotes] = useState("")
  const [editSchedule, setEditSchedule] = useState({})

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  const fetchPlanData = async () => {
    setLoading(true)
    try {
      const docRef = doc(db, "workout_plans", id)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data()
        
        // Guard check for Trainer
        if (userRole === "trainer" && roleData?.name) {
          const trainerName = roleData.name
          const planTrainer = data.trainerName || ""
          if (planTrainer.toLowerCase().trim() !== trainerName.toLowerCase().trim()) {
            alert("Access Denied: You did not create this plan.")
            navigate("/trainer-dashboard", { replace: true })
            return
          }
        }

        setPlan(data)
        setExercises(data.exercises || [])

        // Prep edit states
        setEditPlanName(data.planName || "")
        setEditMemberName(data.memberName || "")
        setEditGoal(data.goal || "Weight Loss")
        setEditTrainerName(data.trainerName || "")
        setEditStartDate(data.startDate || "")
        setEditEndDate(data.endDate || "")
        setEditDietNotes(data.dietNotes || "")
        setEditSchedule(data.schedule || {
          Monday: "Rest",
          Tuesday: "Rest",
          Wednesday: "Rest",
          Thursday: "Rest",
          Friday: "Rest",
          Saturday: "Rest",
          Sunday: "Rest",
        })

        // Fetch gym members list for relations dropdown
        const membersSnap = await getDocs(collection(db, "members"))
        let membersData = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        if (userRole === "trainer" && roleData?.name) {
          const trainerName = roleData.name
          membersData = membersData.filter(m => (m.assignedTrainer || "").toLowerCase().trim() === trainerName.toLowerCase().trim())
        }
        setMembers(membersData)
      } else {
        alert("Workout plan not found.")
        navigate(userRole === "owner" ? "/workout-plans" : "/trainer-dashboard")
      }
    } catch (error) {
      console.error("Error fetching workout plan: ", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userRole === "member") {
      navigate("/member-dashboard", { replace: true })
      return
    }
    fetchPlanData()
  }, [id, userRole, roleData])

  const handleBackClick = () => {
    if (userRole === "owner") {
      navigate("/workout-plans")
    } else {
      navigate("/trainer-dashboard")
    }
  }

  const getBackText = () => {
    if (userRole === "owner") return "Back to Workout Plans"
    return "Back to Dashboard"
  }


  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      const docRef = doc(db, "workout_plans", id)
      await updateDoc(docRef, {
        planName: editPlanName,
        memberName: editMemberName,
        goal: editGoal,
        trainerName: editTrainerName,
        startDate: editStartDate,
        endDate: editEndDate,
        dietNotes: editDietNotes,
        schedule: editSchedule
      })
      setShowEditModal(false)
      fetchPlanData()
    } catch (error) {
      console.error("Error saving plan details: ", error)
      alert("Failed to save changes.")
    }
  }

  const handleDayChange = (day, value) => {
    setEditSchedule((prev) => ({
      ...prev,
      [day]: value,
    }))
  }

  // Manage Exercises List
  const handleAddExercise = async (e) => {
    e.preventDefault()
    if (!newExName || !newExSets || !newExReps) return

    const newEx = {
      id: Date.now().toString(),
      name: newExName,
      sets: Number(newExSets),
      reps: newExReps,
      done: false
    }

    const updatedExercises = [...exercises, newEx]
    setExercises(updatedExercises)

    try {
      const docRef = doc(db, "workout_plans", id)
      await updateDoc(docRef, { exercises: updatedExercises })
      setNewExName("")
      setNewExSets("")
      setNewExReps("")
    } catch (error) {
      console.error("Error adding exercise: ", error)
      alert("Failed to save exercise.")
    }
  }

  const handleDeleteExercise = async (exId) => {
    const updatedExercises = exercises.filter(ex => ex.id !== exId)
    setExercises(updatedExercises)

    try {
      const docRef = doc(db, "workout_plans", id)
      await updateDoc(docRef, { exercises: updatedExercises })
    } catch (error) {
      console.error("Error deleting exercise: ", error)
    }
  }

  const handleToggleExerciseDone = async (exId) => {
    const updatedExercises = exercises.map(ex => 
      ex.id === exId ? { ...ex, done: !ex.done } : ex
    )
    setExercises(updatedExercises)

    try {
      const docRef = doc(db, "workout_plans", id)
      await updateDoc(docRef, { exercises: updatedExercises })
    } catch (error) {
      console.error("Error toggling exercise status: ", error)
    }
  }

  const handleDeletePlan = async () => {
    if (window.confirm("Are you sure you want to permanently delete this workout plan?")) {
      try {
        await deleteDoc(doc(db, "workout_plans", id))
        navigate("/workout-plans")
      } catch (error) {
        console.error("Error deleting workout plan: ", error)
      }
    }
  }

  const getGoalBadgeClass = (goalType) => {
    switch (goalType) {
      case "Weight Loss": return "bg-cyan-950 text-cyan-400 border border-cyan-800"
      case "Muscle Gain": return "bg-emerald-950 text-emerald-400 border border-emerald-800"
      case "Strength": return "bg-amber-950 text-amber-400 border border-amber-800"
      case "Beginner Fitness": return "bg-purple-950 text-purple-400 border border-purple-800"
      case "Fat Loss": return "bg-rose-950 text-rose-400 border border-rose-800"
      default: return "bg-gray-800 text-gray-400 border border-gray-700"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center gap-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm">Fetching plan schedule...</p>
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

      {/* Plan Header */}
      <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <div className="flex gap-2 items-center mb-3">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${getGoalBadgeClass(plan.goal)}`}>
              {plan.goal}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-wide">{plan.planName}</h1>
          <p className="text-gray-400 text-sm mt-1">
            Assigned to <span className="text-white font-semibold">{plan.memberName}</span> • Created by <span className="text-white font-semibold">{plan.trainerName}</span>
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <button 
            onClick={() => setShowEditModal(true)}
            className="flex-1 md:flex-initial bg-gray-900 hover:bg-gray-850 border border-gray-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Edit3 size={14} /> Edit Plan Details
          </button>
          <button 
            onClick={handleDeletePlan}
            className="flex-1 md:flex-initial bg-red-950/20 hover:bg-red-950/45 text-red-500 border border-red-900/60 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Trash2 size={14} /> Delete Program
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: TIMINGS & EXERCISES LIST */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          
          {/* Plan Duration */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-5 flex items-center gap-2">
              <Calendar className="text-red-500" size={18} /> Plan Validity
            </h2>
            <div className="flex flex-col gap-3 text-sm">
              <div className="bg-black/40 border border-gray-900 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-gray-400">Start Date</span>
                <strong className="text-white">{plan.startDate}</strong>
              </div>
              <div className="bg-black/40 border border-gray-900 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-gray-400">End Date</span>
                <strong className="text-white">{plan.endDate}</strong>
              </div>
            </div>
          </div>

          {/* Dynamic Exercises Checklist */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <Dumbbell className="text-red-500" size={18} /> Plan Exercises ({exercises.length})
            </h2>

            {/* Form to Add Exercise */}
            <form onSubmit={handleAddExercise} className="flex flex-col gap-3 mb-6 bg-black/40 border border-gray-900 p-4 rounded-2xl">
              <input
                type="text"
                placeholder="Exercise Name (e.g. Bench Press)"
                value={newExName}
                onChange={(e) => setNewExName(e.target.value)}
                required
                className="bg-black border border-gray-850 rounded-xl p-2.5 outline-none focus:border-red-650 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Sets"
                  value={newExSets}
                  onChange={(e) => setNewExSets(e.target.value)}
                  required
                  className="bg-black border border-gray-850 rounded-xl p-2.5 outline-none focus:border-red-650 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Reps (e.g. 10-12)"
                  value={newExReps}
                  onChange={(e) => setNewExReps(e.target.value)}
                  required
                  className="bg-black border border-gray-850 rounded-xl p-2.5 outline-none focus:border-red-650 text-xs text-white"
                />
              </div>
              <button 
                type="submit"
                className="bg-red-600 hover:bg-red-700 transition-all rounded-xl py-2 text-xs font-bold text-white cursor-pointer"
              >
                Add Exercise
              </button>
            </form>

            {/* List Exercises */}
            {exercises.length === 0 ? (
              <div className="text-center text-gray-600 text-xs italic py-4">No exercises added.</div>
            ) : (
              <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1">
                {exercises.map((ex) => (
                  <div key={ex.id} className="bg-black border border-gray-900 p-3 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleToggleExerciseDone(ex.id)}
                        className="text-red-500 cursor-pointer"
                      >
                        {ex.done ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                      <div>
                        <strong className={`text-sm text-white block ${ex.done ? "line-through text-gray-500" : ""}`}>{ex.name}</strong>
                        <span className="text-xs text-gray-500">{ex.sets} Sets • {ex.reps} Reps</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteExercise(ex.id)}
                      className="text-gray-500 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: TRAINING WEEKLY SCHEDULE & DIETS */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Training Schedule */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <Dumbbell className="text-red-500" size={18} /> Weekly Training Schedule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {daysOfWeek.map((day) => (
                <div key={day} className="bg-black border border-gray-900 p-4 rounded-2xl flex justify-between items-start">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block shrink-0 pt-0.5">{day}</span>
                  <strong className="text-sm text-white text-right font-semibold max-w-[200px] break-words">
                    {plan.schedule?.[day] || "Rest"}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Diet Notes */}
          {plan.dietNotes && (
            <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
              <h3 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
                <Apple className="text-red-500" size={18} /> Diet & Nutrition Program
              </h3>
              <div className="bg-black border border-gray-900 p-5 rounded-2xl text-sm text-gray-305 leading-relaxed whitespace-pre-wrap">
                {plan.dietNotes}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* EDIT PLAN DETAILS MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveProfile}
            className="bg-[#111111] border border-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800 bg-[#151515] flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="text-red-650" size={20} /> Edit Workout Program
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Plan Name</label>
                  <input
                    type="text"
                    value={editPlanName}
                    onChange={(e) => setEditPlanName(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Assign Member</label>
                  <select
                    value={editMemberName}
                    onChange={(e) => setEditMemberName(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white cursor-pointer"
                  >
                    <option value="">-- Choose Member --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Fitness Goal</label>
                  <select
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white cursor-pointer"
                  >
                    <option value="Weight Loss">Weight Loss</option>
                    <option value="Muscle Gain">Muscle Gain</option>
                    <option value="Strength">Strength</option>
                    <option value="Beginner Fitness">Beginner Fitness</option>
                    <option value="Fat Loss">Fat Loss</option>
                  </select>
                </div>
                 <div className="flex flex-col gap-1">
                   <label className="text-xs text-gray-500 font-bold uppercase">Trainer Name</label>
                   <input
                     type="text"
                     value={editTrainerName}
                     onChange={(e) => setEditTrainerName(e.target.value)}
                     required
                     readOnly={userRole === "trainer"}
                     className={`bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-650 text-sm text-white ${
                       userRole === "trainer" ? "text-gray-500 cursor-not-allowed" : ""
                     }`}
                   />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Start Date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">End Date</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                  />
                </div>
              </div>

              {/* Weekly Workout Inputs */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-red-500 tracking-wider uppercase border-b border-gray-900 pb-1">
                  Weekly Schedule
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="flex gap-2 items-center">
                      <span className="text-[11px] text-gray-400 w-16 font-bold shrink-0">{day}</span>
                      <input
                        type="text"
                        value={editSchedule[day] || "Rest"}
                        onChange={(e) => handleDayChange(day, e.target.value)}
                        required
                        className="bg-black border border-gray-800 rounded-xl p-2 outline-none focus:border-red-600 text-xs flex-1 text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-bold uppercase">Diet & Nutrition Notes</label>
                <textarea
                  placeholder="Record meals, macros, or supplements..."
                  value={editDietNotes}
                  onChange={(e) => setEditDietNotes(e.target.value)}
                  rows="3"
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-650 text-sm text-white resize-none"
                />
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
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}

export default WorkoutPlanDetail
