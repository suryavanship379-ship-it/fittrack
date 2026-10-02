import { useEffect, useState } from "react"
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot } from "firebase/firestore"
import { db } from "../firebase"
import { Dumbbell, Apple, Calendar, Trash2, X, Plus, Search, ChevronDown, ChevronUp, Users, Target, Activity } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function WorkoutPlans() {
  const navigate = useNavigate()
  const { userRole, roleData } = useAuth()

  // Members list for dropdown selection
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  // Form states
  const [planName, setPlanName] = useState("")
  const [selectedMember, setSelectedMember] = useState("")
  const [customMember, setCustomMember] = useState("")
  const [showCustomMember, setShowCustomMember] = useState(false)
  const [goal, setGoal] = useState("Weight Loss")
  const [trainerName, setTrainerName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [dietNotes, setDietNotes] = useState("")
  
  // Weekly Schedule states (populated with defaults)
  const [schedule, setSchedule] = useState({
    Monday: "Chest + Triceps",
    Tuesday: "Back + Biceps",
    Wednesday: "Legs",
    Thursday: "Cardio",
    Friday: "Shoulders",
    Saturday: "Full Body",
    Sunday: "Rest",
  })

  // Workout Plans list
  const [workoutPlans, setWorkoutPlans] = useState([])
  
  // Modal view state (legacy modal state - keep intact but unused)
  const [activeModalPlan, setActiveModalPlan] = useState(null)

  // Redesign state additions
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [showWeeklySchedule, setShowWeeklySchedule] = useState(false)

  // Fetch members to populate the dropdown
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "members"))
        let membersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        if (userRole === "trainer" && roleData?.name) {
          const name = roleData.name
          membersData = membersData.filter(m => (m.assignedTrainer || "").toLowerCase().trim() === name.toLowerCase().trim())
        }
        setMembers(membersData)
      } catch (error) {
        console.error("Error fetching members: ", error)
      } finally {
        setLoadingMembers(false)
      }
    }
    if (userRole) {
      fetchMembers()
    }
  }, [userRole, roleData])

  // Live listener for workout plans
  useEffect(() => {
    if (!userRole) return
    const unsubscribe = onSnapshot(
      collection(db, "workout_plans"),
      (snapshot) => {
        let plans = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        if (userRole === "trainer" && roleData?.name) {
          const name = roleData.name
          plans = plans.filter(p => (p.trainerName || "").toLowerCase().trim() === name.toLowerCase().trim())
        }
        setWorkoutPlans(plans)
      },
      (error) => {
        console.error("Error fetching workout plans: ", error)
      }
    )

    return () => unsubscribe()
  }, [userRole, roleData])

  // Pre-fill trainerName if logged in user is trainer
  useEffect(() => {
    if (userRole === "trainer" && roleData?.name) {
      setTrainerName(roleData.name)
    }
  }, [userRole, roleData])

  const handleDayChange = (day, value) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: value,
    }))
  }

  const handleMemberChange = (e) => {
    const value = e.target.value
    setSelectedMember(value)
    if (value === "custom") {
      setShowCustomMember(true)
    } else {
      setShowCustomMember(false)
      setCustomMember("")
    }
  }

  const handleAddPlan = async (e) => {
    e.preventDefault()

    const finalMemberName = showCustomMember ? customMember : selectedMember
    if (!finalMemberName) {
      alert("Please select or enter a member name")
      return
    }

    try {
      await addDoc(collection(db, "workout_plans"), {
        planName,
        memberName: finalMemberName,
        goal,
        trainerName,
        startDate,
        endDate,
        dietNotes,
        schedule,
        createdAt: new Date().toISOString(),
      })

      // Reset form fields but keep schedule defaults
      setPlanName("")
      setSelectedMember("")
      setCustomMember("")
      setShowCustomMember(false)
      setGoal("Weight Loss")
      setTrainerName("")
      setStartDate("")
      setEndDate("")
      setDietNotes("")
      setSchedule({
        Monday: "Chest + Triceps",
        Tuesday: "Back + Biceps",
        Wednesday: "Legs",
        Thursday: "Cardio",
        Friday: "Shoulders",
        Saturday: "Full Body",
        Sunday: "Rest",
      })
    } catch (error) {
      console.error("Error adding workout plan: ", error)
      alert("Failed to save workout plan. Please try again.")
    }
  }

  const handleDeletePlan = async (id, e) => {
    e.stopPropagation() // Prevent opening modal when clicking delete
    if (window.confirm("Are you sure you want to delete this workout plan?")) {
      try {
        await deleteDoc(doc(db, "workout_plans", id))
      } catch (error) {
        console.error("Error deleting workout plan: ", error)
      }
    }
  }

  // Get badge colors depending on the selected goal
  const getGoalBadgeClass = (goalType) => {
    switch (goalType) {
      case "Weight Loss":
        return "bg-cyan-950 text-cyan-400 border border-cyan-800"
      case "Muscle Gain":
        return "bg-emerald-950 text-emerald-400 border border-emerald-800"
      case "Strength":
        return "bg-amber-950 text-amber-400 border border-amber-800"
      case "Beginner Fitness":
        return "bg-purple-950 text-purple-400 border border-purple-800"
      case "Fat Loss":
        return "bg-rose-950 text-rose-400 border border-rose-800"
      default:
        return "bg-gray-800 text-gray-400 border border-gray-700"
    }
  }

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  // Calculations
  const activePlans = workoutPlans.length
  const weightLossPlans = workoutPlans.filter((p) => p.goal === "Weight Loss" || p.goal === "Fat Loss").length
  const muscleGainPlans = workoutPlans.filter((p) => p.goal === "Muscle Gain").length
  const membersAssigned = new Set(workoutPlans.map((p) => p.memberName)).size

  // Filter workout plans
  const filteredPlans = workoutPlans.filter((plan) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = 
      plan.planName?.toLowerCase().includes(query) ||
      plan.memberName?.toLowerCase().includes(query) ||
      plan.trainerName?.toLowerCase().includes(query)

    if (selectedFilter === "All") return matchesSearch
    return matchesSearch && plan.goal === selectedFilter
  })

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-10">
      {/* Hero Banner Section */}
      <div className="hero-banner">
        <div className="hero-content flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
          <div>
            <span className="hero-tag">Workouts Ledger</span>
            <h1 className="hero-title">Workout <span className="text-red-655 text-red-600">Plans</span></h1>
            <p className="hero-desc">
              Create, assign and monitor training programs.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-black/40 hover:bg-black/60 border border-gray-800 text-white px-6 py-3 rounded-xl font-semibold transition-all z-10 shrink-0 cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Plans */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Active Plans</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <Dumbbell size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{activePlans}</div>
          </div>
        </div>

        {/* Weight Loss Plans */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Weight Loss / Fat Loss</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <Target size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{weightLossPlans}</div>
          </div>
        </div>

        {/* Muscle Gain Plans */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Muscle Gain</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <Activity size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{muscleGainPlans}</div>
          </div>
        </div>

        {/* Members Assigned */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Members Assigned</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{membersAssigned}</div>
          </div>
        </div>
      </div>

      {/* 2-Column Split Workspace */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Side: Create Plan Form (35% width) */}
        <div className="w-full lg:w-[35%] shrink-0 lg:sticky lg:top-6 z-10">
          <form
            onSubmit={handleAddPlan}
            className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-2xl flex flex-col gap-5"
          >
            <h2 className="text-xl font-bold border-b border-gray-800 pb-3 flex items-center gap-2">
              <Plus className="text-red-655 text-red-600" size={20} /> Create New Plan
            </h2>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Plan Name</label>
              <input
                type="text"
                placeholder="e.g. 12-Week Transformation"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                required
                className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Assign Member</label>
              {loadingMembers ? (
                <div className="text-xs text-gray-500 py-2">Loading members list...</div>
              ) : (
                <select
                  value={selectedMember}
                  onChange={handleMemberChange}
                  required
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white cursor-pointer"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.name}>
                      {member.name}
                    </option>
                  ))}
                  <option value="custom">+ Assign custom name</option>
                </select>
              )}
            </div>

            {showCustomMember && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Custom Member Name</label>
                <input
                  type="text"
                  placeholder="Enter member's name"
                  value={customMember}
                  onChange={(e) => setCustomMember(e.target.value)}
                  required
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Fitness Goal</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white cursor-pointer"
                >
                  <option value="Weight Loss">Weight Loss</option>
                  <option value="Muscle Gain">Muscle Gain</option>
                  <option value="Strength">Strength</option>
                  <option value="Beginner Fitness">Beginner Fitness</option>
                  <option value="Fat Loss">Fat Loss</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Trainer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Coach Alex"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  required
                  readOnly={userRole === "trainer"}
                  className={`bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white ${
                    userRole === "trainer" ? "text-gray-500 cursor-not-allowed bg-black/40" : ""
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white cursor-pointer"
                />
              </div>
            </div>

            {/* Collapsible Weekly Workout Section */}
            <div className="flex flex-col gap-2 border border-gray-900 bg-black/20 p-3 rounded-2xl">
              <button
                type="button"
                onClick={() => setShowWeeklySchedule(!showWeeklySchedule)}
                className="flex justify-between items-center w-full text-xs font-bold text-red-500 uppercase tracking-wider py-1 cursor-pointer select-none"
              >
                <span>Weekly Schedule</span>
                {showWeeklySchedule ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {showWeeklySchedule && (
                <div className="flex flex-col gap-3 mt-2 max-h-[200px] overflow-y-auto pr-1 animate-fadeIn">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="flex gap-2 items-center">
                      <span className="text-[10px] text-gray-400 w-16 font-bold shrink-0">{day}</span>
                      <input
                        type="text"
                        value={schedule[day]}
                        onChange={(e) => handleDayChange(day, e.target.value)}
                        required
                        placeholder={`Workout for ${day}`}
                        className="bg-black border border-gray-800 rounded-xl p-2 outline-none focus:border-red-600 text-xs flex-1 transition-all text-white"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase flex items-center gap-1">
                <Apple size={14} className="text-red-500" /> Diet & Nutrition Notes
              </label>
              <textarea
                placeholder="Include meals, macros, or supplements..."
                value={dietNotes}
                onChange={(e) => setDietNotes(e.target.value)}
                rows={2}
                className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm resize-none transition-all text-white"
              />
            </div>

            <button className="bg-red-600 hover:bg-red-700 text-black font-extrabold rounded-xl py-3 mt-1 text-sm tracking-wider uppercase transition-all active:scale-95 shadow-md shadow-red-950/20 cursor-pointer">
              Save Plan
            </button>
          </form>
        </div>

        {/* Right Side: Existing Plans (65% width) */}
        <div className="flex-1 w-full flex flex-col gap-6">
          {/* Search Bar */}
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search plans by name, assigned member, or coach..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-red-600 text-sm transition-all text-white"
            />
          </div>

          {/* Goal Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {["All", "Weight Loss", "Muscle Gain", "Strength", "Cardio"].map((filterOpt) => (
              <button
                key={filterOpt}
                onClick={() => setSelectedFilter(filterOpt)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  selectedFilter === filterOpt
                    ? "bg-red-655 bg-red-600 text-black border-red-650"
                    : "bg-black text-gray-400 border-gray-800 hover:text-white hover:border-gray-700"
                }`}
              >
                {filterOpt}
              </button>
            ))}
          </div>

          {filteredPlans.length === 0 ? (
            <div className="bg-[#111111] border border-gray-800 rounded-3xl p-12 text-center flex flex-col items-center gap-3 animate-fadeIn">
              <Dumbbell className="text-gray-600" size={48} />
              <h3 className="text-xl font-bold text-gray-400">No Workout Plans Found</h3>
              <p className="text-gray-500 text-sm max-w-xs">
                {searchQuery || selectedFilter !== "All"
                  ? "No plans match your current search and filter settings."
                  : "Fill in the form on the left to add a custom weekly routine for a gym member."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              {filteredPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => navigate(`/workout-plans/${plan.id}`)}
                  className="bg-[#111111] border border-gray-800 hover:border-red-600 rounded-3xl p-6 shadow-lg flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:-translate-y-1 h-full"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full ${getGoalBadgeClass(plan.goal)}`}>
                        {plan.goal}
                      </span>
                      <button
                        onClick={(e) => handleDeletePlan(plan.id, e)}
                        className="text-gray-500 hover:text-red-500 transition-all p-1.5 shrink-0 cursor-pointer"
                        title="Delete Plan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <h3 className="text-xl font-bold text-white tracking-wide leading-snug line-clamp-1">{plan.planName}</h3>
                      <p className="text-gray-400 text-sm font-semibold">
                        Member: <span className="text-white">{plan.memberName}</span>
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 border-t border-gray-900 pt-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar size={14} className="text-red-500 shrink-0" />
                        <span>
                          Duration: <strong className="text-gray-200">{plan.startDate} to {plan.endDate}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Dumbbell size={14} className="text-red-500 shrink-0" />
                        <span>
                          Coach: <strong className="text-white">{plan.trainerName}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1 mt-6">
                    View Schedule & Diet Details →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Overlay Modal */}
      {activeModalPlan && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#151515]">
              <div>
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full inline-block mb-2 ${getGoalBadgeClass(activeModalPlan.goal)}`}>
                  {activeModalPlan.goal}
                </span>
                <h2 className="text-2xl font-bold text-white">{activeModalPlan.planName}</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Assigned to <span className="text-white font-semibold">{activeModalPlan.memberName}</span> • Trainer: <span className="text-white font-semibold">{activeModalPlan.trainerName}</span>
                </p>
              </div>
              <button
                onClick={() => setActiveModalPlan(null)}
                className="bg-black/50 hover:bg-black border border-gray-800 p-2.5 rounded-full text-gray-400 hover:text-white transition-all shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Dates */}
              <div className="bg-black/40 border border-gray-900 p-4 rounded-2xl flex items-center gap-3">
                <Calendar className="text-red-500" size={20} />
                <div className="text-sm">
                  <span className="text-gray-400">Duration: </span>
                  <span className="font-semibold text-white">
                    {activeModalPlan.startDate} to {activeModalPlan.endDate}
                  </span>
                </div>
              </div>

              {/* Weekly Schedule list */}
              <div>
                <h3 className="text-base font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Dumbbell size={18} /> Training Schedule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {daysOfWeek.map((day) => (
                    <div
                      key={day}
                      className="bg-black border border-gray-900 p-3 rounded-2xl flex items-start justify-between"
                    >
                      <div className="text-xs font-bold text-gray-400 w-24 uppercase shrink-0 pt-0.5">{day}</div>
                      <div className="text-sm text-white font-semibold text-right flex-1 break-words">
                        {activeModalPlan.schedule?.[day] || "Rest"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diet and Nutrition */}
              {activeModalPlan.dietNotes && (
                <div className="border-t border-gray-900 pt-6">
                  <h3 className="text-base font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Apple size={18} /> Diet & Nutrition Notes
                  </h3>
                  <div className="bg-black border border-gray-900 p-4 rounded-2xl text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {activeModalPlan.dietNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-800 flex justify-end bg-[#151515]">
              <button
                onClick={() => setActiveModalPlan(null)}
                className="bg-gray-800 hover:bg-gray-700 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkoutPlans
