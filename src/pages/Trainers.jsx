import { useEffect, useState } from "react"
import { collection, addDoc, doc, deleteDoc, onSnapshot, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { User, Phone, Briefcase, Clock, IndianRupee, Users, Trash2, Shield, Plus, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"

function Trainers() {
  const navigate = useNavigate()
  
  // Members list for dropdown/checkbox selection
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  // Form states
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [experience, setExperience] = useState("")
  const [selectedSpecializations, setSelectedSpecializations] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [availability, setAvailability] = useState("Full-Time")
  const [salary, setSalary] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("Pending")
  const [error, setError] = useState("")
  const [addingTrainer, setAddingTrainer] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Trainers list
  const [trainers, setTrainers] = useState([])

  // Specialization options
  const specializationOptions = [
    "Weight Loss",
    "Muscle Gain",
    "Cardio",
    "Personal Training",
    "Yoga",
    "Zumba",
  ]

  // Fetch active gym members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "members"))
        const membersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setMembers(membersData)
      } catch (error) {
        console.error("Error fetching members: ", error)
      } finally {
        setLoadingMembers(false)
      }
    }
    fetchMembers()
  }, [])

  // Real-time listener for trainers
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "trainers"),
      (snapshot) => {
        const trainersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setTrainers(trainersData)
      },
      (error) => {
        console.error("Error fetching trainers: ", error)
      }
    )

    return () => unsubscribe()
  }, [])

  const handleSpecializationToggle = (spec) => {
    setSelectedSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((item) => item !== spec) : [...prev, spec]
    )
  }

  const handleMemberToggle = (memberName) => {
    setSelectedMembers((prev) =>
      prev.includes(memberName) ? prev.filter((name) => name !== memberName) : [...prev, memberName]
    )
  }

  const handleAddTrainer = async (e) => {
    e.preventDefault()
    setError("")
    setAddingTrainer(true)

    try {
      const { createSecondaryUser } = await import("../firebase")
      const { setDoc, doc } = await import("firebase/firestore")

      // 1. Create auth user
      const uid = await createSecondaryUser(email, password)

      // 2. Create trainer profile document
      const trainerRef = await addDoc(collection(db, "trainers"), {
        name,
        phone,
        experience,
        specializations: selectedSpecializations,
        assignedMembers: selectedMembers,
        availability,
        salary: Number(salary),
        paymentStatus,
        createdAt: new Date().toISOString(),
      })
      const createdTrainerDocId = trainerRef.id

      // 3. Create user mapping document
      await setDoc(doc(db, "users", uid), {
        uid,
        email,
        role: "trainer",
        trainerId: createdTrainerDocId
      })

      // Reset form fields
      setName("")
      setPhone("")
      setEmail("")
      setPassword("")
      setExperience("")
      setSelectedSpecializations([])
      setSelectedMembers([])
      setAvailability("Full-Time")
      setSalary("")
      setPaymentStatus("Pending")
      alert("Trainer account and profile created successfully!")
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to create trainer account")
      alert("Failed to create trainer account: " + (err.message || err))
    } finally {
      setAddingTrainer(false)
    }
  }

  const handleDeleteTrainer = async (id) => {
    if (window.confirm("Are you sure you want to delete this trainer profile?")) {
      try {
        await deleteDoc(doc(db, "trainers", id))
      } catch (error) {
        console.error("Error deleting trainer: ", error)
      }
    }
  }

  // Calculations
  const totalTrainers = trainers.length
  const fullTimeTrainers = trainers.filter(t => t.availability === "Full-Time").length
  const pendingSalaries = trainers
    .filter(t => t.paymentStatus === "Pending")
    .reduce((sum, t) => sum + Number(t.salary || 0), 0)
  const totalAssignedMembers = trainers.reduce(
    (sum, t) => sum + (t.assignedMembers?.length || 0),
    0
  )

  // Filter trainers list
  const filteredTrainers = trainers.filter((trainer) => {
    const query = searchQuery.toLowerCase()
    return (
      trainer.name?.toLowerCase().includes(query) ||
      trainer.phone?.toLowerCase().includes(query) ||
      trainer.specializations?.some((s) => s.toLowerCase().includes(query))
    )
  })

  const getInitials = (name) => {
    if (!name) return ""
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-10">
      {/* Page Title Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[28px] md:text-[36px] lg:text-[48px] font-extrabold tracking-tight uppercase leading-tight">
            Gym <span className="text-red-650 text-red-600">Trainers</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            Register and manage trainer details, payment status, shifts, and assigned members.
          </p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Trainers */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Trainers</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <User size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{totalTrainers}</div>
          </div>
        </div>

        {/* Full-Time Trainers */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Full-Time Shift</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{fullTimeTrainers}</div>
          </div>
        </div>

        {/* Pending Salaries */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Pending Salaries</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">₹{pendingSalaries.toLocaleString()}</div>
          </div>
        </div>

        {/* Assigned Members */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Assigned Members</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{totalAssignedMembers}</div>
          </div>
        </div>
      </div>

      {/* Main Side-by-Side Content Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Side: Creation Form Panel */}
        <div className="w-full lg:w-[420px] shrink-0 lg:sticky lg:top-6 z-10">
          <form
            onSubmit={handleAddTrainer}
            className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-2xl flex flex-col gap-6"
          >
            <h2 className="text-xl font-bold border-b border-gray-800 pb-3 flex items-center gap-2">
              <Plus className="text-red-655 text-red-600" size={20} /> Add New Trainer
            </h2>

            {error && (
              <p className="bg-red-600/20 text-red-400 p-3 rounded-lg text-center text-xs border border-red-900/50">
                {error}
              </p>
            )}

            {/* Section: Basic Details */}
            <div className="flex flex-col gap-4">
              <div className="border-b border-gray-900 pb-1.5 mb-1">
                <span className="text-[10px] font-bold tracking-widest text-red-650 text-red-600 uppercase">Basic Details</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Trainer Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Trainer Email</label>
                <input
                  type="email"
                  placeholder="e.g. trainer@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Temp Password</label>
                  <input
                    type="password"
                    placeholder="min 6 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white"
                  />
                </div>
              </div>
            </div>

            {/* Section: Professional Details */}
            <div className="flex flex-col gap-4">
              <div className="border-b border-gray-900 pb-1.5 mb-1">
                <span className="text-[10px] font-bold tracking-widest text-red-650 text-red-600 uppercase">Professional Details</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Experience (Years)</label>
                  <input
                    type="text"
                    placeholder="e.g. 5"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Availability</label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white cursor-pointer"
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase flex items-center gap-1">
                  <Shield size={14} className="text-red-500" /> Specializations
                </label>
                <div className="grid grid-cols-2 gap-2 bg-black border border-gray-800 p-3 rounded-2xl">
                  {specializationOptions.map((spec) => (
                    <label key={spec} className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedSpecializations.includes(spec)}
                        onChange={() => handleSpecializationToggle(spec)}
                        className="rounded border-gray-800 bg-black text-red-600 focus:ring-red-600 shrink-0"
                      />
                      {spec}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Section: Assign Members */}
            <div className="flex flex-col gap-4">
              <div className="border-b border-gray-900 pb-1.5 mb-1">
                <span className="text-[10px] font-bold tracking-widest text-red-655 text-red-600 uppercase">Assign Members</span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto border border-gray-800 rounded-2xl p-3 bg-black">
                  {loadingMembers ? (
                    <p className="text-gray-500 text-xs">Loading members...</p>
                  ) : members.length === 0 ? (
                    <p className="text-gray-500 text-xs">No active gym members found</p>
                  ) : (
                    members.map((member) => (
                      <label key={member.id} className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.name)}
                          onChange={() => handleMemberToggle(member.name)}
                          className="rounded border-gray-800 bg-black text-red-600 focus:ring-red-600 shrink-0"
                        />
                        {member.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Section: Salary Details */}
            <div className="flex flex-col gap-4">
              <div className="border-b border-gray-900 pb-1.5 mb-1">
                <span className="text-[10px] font-bold tracking-widest text-red-650 text-red-600 uppercase">Salary Details</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 20000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Salary Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm transition-all text-white cursor-pointer"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              disabled={addingTrainer}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-900 transition-all rounded-xl py-3 mt-2 text-sm font-bold tracking-wider uppercase text-white cursor-pointer"
            >
              {addingTrainer ? "Creating Account..." : "Save Trainer"}
            </button>
          </form>
        </div>

        {/* Right Side: Trainers List & Search */}
        <div className="flex-1 w-full flex flex-col gap-6">
          {/* Search Bar */}
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search trainers by name, phone number, specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-red-600 text-sm transition-all text-white"
            />
          </div>

          {filteredTrainers.length === 0 ? (
            <div className="bg-[#111111] border border-gray-800 rounded-3xl p-12 text-center flex flex-col items-center gap-3 animate-fadeIn">
              <User className="text-gray-600" size={48} />
              <h3 className="text-xl font-bold text-gray-400">No Trainers Found</h3>
              <p className="text-gray-500 text-sm max-w-xs">
                {searchQuery ? "No trainers match your search criteria." : "Fill out the trainer profile form on the left to add your gym staff."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              {filteredTrainers.map((trainer) => (
                <div
                  key={trainer.id}
                  onClick={() => navigate(`/trainers/${trainer.id}`)}
                  className="bg-[#111111] border border-gray-800 hover:border-red-600/50 rounded-3xl p-6 shadow-lg flex flex-col justify-between transition-all duration-300 cursor-pointer transform hover:-translate-y-1 h-full"
                >
                  <div className="flex flex-col gap-4">
                    {/* Header: Avatar, Name & Phone, Delete Btn */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="avatar w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-red-950 text-red-400">
                          {getInitials(trainer.name)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-lg font-bold text-white tracking-wide truncate">{trainer.name}</span>
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-0.5">
                            <Phone size={12} className="text-gray-500 shrink-0" />
                            <span className="truncate">{trainer.phone}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrainer(trainer.id);
                        }}
                        className="text-gray-500 hover:text-red-500 transition-all p-1 shrink-0"
                        title="Delete Trainer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Specialization Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {trainer.specializations && trainer.specializations.length > 0 ? (
                        trainer.specializations.map((spec) => (
                          <span
                            key={spec}
                            className="text-[9px] font-bold uppercase tracking-wider bg-red-950/40 text-red-500 border border-red-900/60 px-2.5 py-0.5 rounded-full"
                          >
                            {spec}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-950 text-gray-500 border border-gray-900 px-2.5 py-0.5 rounded-full">
                          General Training
                        </span>
                      )}
                    </div>

                    {/* Professional Info Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 border-t border-gray-900 pt-4">
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-red-500 shrink-0" />
                        <span>Experience: <strong className="text-white">{trainer.experience} Years</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-red-500 shrink-0" />
                        <span>Shift: <strong className="text-white">{trainer.availability}</strong></span>
                      </div>
                    </div>

                    {/* Assigned Members Section */}
                    <div className="border-t border-gray-900 pt-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                        <Users size={14} className="text-red-500 shrink-0" />
                        <span>Assigned Members ({trainer.assignedMembers?.length || 0})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {trainer.assignedMembers && trainer.assignedMembers.length > 0 ? (
                          trainer.assignedMembers.map((m) => (
                            <span
                              key={m}
                              className="bg-black border border-gray-800 text-[10px] text-gray-300 font-medium px-2 py-0.5 rounded-lg"
                            >
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-500 italic">No assigned members</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Salary & Status Section at Bottom */}
                  <div className="border-t border-gray-900 pt-4 mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <IndianRupee size={14} className="text-red-500 shrink-0" />
                      <span>Salary: <strong className="text-white">₹{Number(trainer.salary || 0).toLocaleString()}</strong></span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        trainer.paymentStatus === "Paid"
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-900"
                          : "bg-amber-950/80 text-amber-400 border-amber-900"
                      }`}
                    >
                      {trainer.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Trainers
