import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { 
  User, Phone, Calendar, Shield, Dumbbell, Award, Edit3, Trash2, 
  MessageSquare, ChevronLeft, CalendarCheck, CreditCard, Camera, FileText
} from "lucide-react"
import { useAuth } from "../context/AuthContext"

function MemberProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole, roleData } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState(null)
  
  // Settings/Metadata
  const [trainers, setTrainers] = useState([])
  const [workoutPlans, setWorkoutPlans] = useState([])
  const [payments, setPayments] = useState([])
  const [attendance, setAttendance] = useState([])
  const [configuredPlans, setConfiguredPlans] = useState([])
  
  // Edit details state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPassword, setEditPassword] = useState("")
  const [hasLoginAccount, setHasLoginAccount] = useState(false)
  const [linkedUserUid, setLinkedUserUid] = useState("")
  const [editPlan, setEditPlan] = useState("")
  const [editExpiry, setEditExpiry] = useState("")
  const [editStatus, setEditStatus] = useState("Active")
  const [editAge, setEditAge] = useState("")
  const [editHeight, setEditHeight] = useState("")
  const [editWeight, setEditWeight] = useState("")
  const [editGoal, setEditGoal] = useState("Weight Loss")
  const [editTrainer, setEditTrainer] = useState("")
  const [editWorkoutPlan, setEditWorkoutPlan] = useState("")

  // Notes state
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  
  // Progress photo state
  const [newPhotoUrl, setNewPhotoUrl] = useState("")
  const [progressPhotos, setProgressPhotos] = useState([])

  const fetchMemberData = async () => {
    setLoading(true)
    try {
      const docRef = doc(db, "members", id)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data()
        
        // Guard check for Trainer assignment
        if (userRole === "trainer" && roleData?.name) {
          const trainerName = roleData.name
          const assignedTrainer = data.assignedTrainer || ""
          if (assignedTrainer.toLowerCase().trim() !== trainerName.toLowerCase().trim()) {
            alert("Access Denied: You are not assigned to this member.")
            navigate("/trainer-dashboard", { replace: true })
            return
          }
        }

        // Fetch external collections for relations
        const [trainersSnap, plansSnap, paymentsSnap, attendanceSnap, settingsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, "trainers")),
          getDocs(collection(db, "workout_plans")),
          getDocs(collection(db, "payments")),
          getDocs(collection(db, "attendance")),
          getDoc(doc(db, "settings", "gym")),
          getDocs(collection(db, "users"))
        ])

        const linkedUser = usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .find(u => u.role === "member" && u.memberId === id)

        setHasLoginAccount(!!linkedUser)
        setLinkedUserUid(linkedUser ? linkedUser.id : "")

        const memberEmail = data.email || (linkedUser ? linkedUser.email : "")
        setMember({
          ...data,
          email: memberEmail
        })
        setNotes(data.notes || "")
        setProgressPhotos(data.progressPhotos || [])
        
        // Prep edit state
        setEditName(data.name || "")
        setEditPhone(data.phone || "")
        setEditPlan(data.plan || "")
        setEditExpiry(data.expiry || "")
        setEditStatus(data.status || "Active")
        setEditAge(data.age || "")
        setEditHeight(data.height || "")
        setEditWeight(data.weight || "")
        setEditGoal(data.goal || "Weight Loss")
        setEditTrainer(data.assignedTrainer || "")
        setEditWorkoutPlan(data.workoutPlan || "")
        setEditEmail(memberEmail)
        setEditPassword("")
        
        setTrainers(trainersSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setWorkoutPlans(plansSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        if (settingsSnap.exists() && settingsSnap.data().plans) {
          setConfiguredPlans(settingsSnap.data().plans)
        }
        
        // Filter payments and attendance for this member by name match
        const memberName = data.name || ""
        setPayments(paymentsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => (p.memberName || "").toLowerCase().trim() === memberName.toLowerCase().trim())
        )
        setAttendance(attendanceSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => (a.memberName || "").toLowerCase().trim() === memberName.toLowerCase().trim())
        )
      } else {
        alert("Member profile not found.")
        navigate(userRole === "owner" ? "/members" : userRole === "trainer" ? "/trainer-dashboard" : "/member-dashboard")
      }
    } catch (error) {
      console.error("Error loading member details: ", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userRole === "member" && roleData?.id !== id) {
      navigate("/member-dashboard", { replace: true })
      return
    }
    fetchMemberData()
  }, [id, userRole, roleData])

  const handleBackClick = () => {
    if (userRole === "owner") {
      navigate("/members")
    } else if (userRole === "trainer") {
      navigate("/trainer-dashboard")
    } else {
      navigate("/member-dashboard")
    }
  }

  const getBackText = () => {
    if (userRole === "owner") return "Back to Members"
    return "Back to Dashboard"
  }


  // Save profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      const { createSecondaryUser } = await import("../firebase")
      const { setDoc, doc, updateDoc } = await import("firebase/firestore")

      let uid = linkedUserUid

      if (!hasLoginAccount && editEmail.trim() !== "") {
        if (!editPassword || editPassword.length < 6) {
          alert("A temporary password of at least 6 characters is required to create a login account.")
          return
        }
        try {
          uid = await createSecondaryUser(editEmail, editPassword)
          await setDoc(doc(db, "users", uid), {
            uid,
            email: editEmail,
            role: "member",
            memberId: id
          })
          setHasLoginAccount(true)
          setLinkedUserUid(uid)
          alert("Firebase login account created successfully for this member!")
        } catch (authErr) {
          console.error("Auth creation failed: ", authErr)
          alert("Failed to create login account: " + (authErr.message || authErr))
          return
        }
      } else if (hasLoginAccount && editEmail.trim() !== "" && editEmail !== member.email) {
        await updateDoc(doc(db, "users", linkedUserUid), {
          email: editEmail
        })
      }

      const docRef = doc(db, "members", id)
      const updateData = {
        name: editName,
        phone: editPhone,
        plan: editPlan,
        expiry: editExpiry,
        status: editStatus,
        age: editAge,
        height: editHeight,
        weight: editWeight,
        goal: editGoal,
        assignedTrainer: editTrainer,
        workoutPlan: editWorkoutPlan,
      }
      if (editEmail.trim() !== "") {
        updateData.email = editEmail
      }
      await updateDoc(docRef, updateData)

      setShowEditModal(false)
      fetchMemberData()
    } catch (error) {
      console.error("Error updating member profile: ", error)
      alert("Failed to update profile. Please try again.")
    }
  }

  // Quick membership renewal
  const handleRenewMembership = async (months) => {
    if (!member) return
    
    // Parse current expiry date
    let baseDate = new Date()
    if (member.expiry) {
      const currentExpiry = new Date(member.expiry)
      if (currentExpiry > baseDate) {
        baseDate = currentExpiry
      }
    }
    
    // Add months
    baseDate.setMonth(baseDate.getMonth() + months)
    const newExpiryDateStr = baseDate.toISOString().split('T')[0]
    
    try {
      const docRef = doc(db, "members", id)
      await updateDoc(docRef, {
        expiry: newExpiryDateStr,
        status: "Active"
      })
      fetchMemberData()
      alert(`Membership renewed successfully! New expiry date: ${newExpiryDateStr}`)
    } catch (error) {
      console.error("Error renewing membership: ", error)
      alert("Renewal failed. Please try again.")
    }
  }

  // Save Notes
  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      const docRef = doc(db, "members", id)
      await updateDoc(docRef, { notes })
      alert("Notes saved successfully!")
    } catch (error) {
      console.error("Error saving notes: ", error)
      alert("Failed to save notes.")
    } finally {
      setSavingNotes(false)
    }
  }

  // Add progress photo (URL or Base64 upload)
  const handleAddPhoto = async (e) => {
    e.preventDefault()
    if (!newPhotoUrl) return

    const newPhoto = {
      url: newPhotoUrl,
      date: new Date().toISOString().split('T')[0]
    }
    const updatedPhotos = [newPhoto, ...progressPhotos]
    
    try {
      const docRef = doc(db, "members", id)
      await updateDoc(docRef, { progressPhotos: updatedPhotos })
      setProgressPhotos(updatedPhotos)
      setNewPhotoUrl("")
    } catch (error) {
      console.error("Error adding progress photo: ", error)
      alert("Failed to add photo.")
    }
  }

  // Handle local image upload as Base64
  const handleLocalImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64Str = reader.result
      const newPhoto = {
        url: base64Str,
        date: new Date().toISOString().split('T')[0]
      }
      const updatedPhotos = [newPhoto, ...progressPhotos]
      
      try {
        const docRef = doc(db, "members", id)
        await updateDoc(docRef, { progressPhotos: updatedPhotos })
        setProgressPhotos(updatedPhotos)
      } catch (error) {
        console.error("Error saving uploaded image: ", error)
        alert("Failed to save image.")
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteMember = async () => {
    if (window.confirm("Are you sure you want to permanently delete this member profile?")) {
      try {
        await deleteDoc(doc(db, "members", id))
        navigate("/members")
      } catch (error) {
        console.error("Error deleting member: ", error)
      }
    }
  }

  const getExpiryStatus = (expiryDateStr) => {
    if (!expiryDateStr) {
      return {
        text: "Active",
        badgeClass: "bg-emerald-950/80 text-emerald-400 border border-emerald-900",
        type: "active",
        daysRemaining: 999
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
        badgeClass: "bg-red-950/85 text-red-400 border border-red-900",
        type: "expired",
        daysRemaining: diffDays
      }
    } else if (diffDays <= 3) {
      return {
        text: "Expiring Soon",
        badgeClass: "bg-amber-950/80 text-amber-400 border border-amber-900/60",
        type: "expiring_soon",
        daysRemaining: diffDays
      }
    } else {
      return {
        text: "Active",
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
        <p className="text-gray-500 text-sm">Fetching member profile...</p>
      </div>
    )
  }

  const expiryInfo = getExpiryStatus(member.expiry)
  const cleanPhone = member.phone ? member.phone.replace(/\D/g, "") : ""
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
  const message = `Hello ${member.name}, your FitTrack gym membership is expiring soon on ${member.expiry}. Please renew to continue your fitness journey.`
  const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`

  // Attendance rate
  const totalLogs = attendance.length
  const presentCount = attendance.filter(a => a.status === "Present").length
  const attendanceRate = totalLogs > 0 ? Math.round((presentCount / totalLogs) * 100) : 0

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
            <h1 className="text-3xl font-black text-white tracking-wide">{member.name}</h1>
            <div className="flex flex-col gap-1 mt-1 text-sm text-gray-400">
              <p className="flex items-center gap-2">
                <Phone size={14} className="text-red-500" /> {member.phone || "N/A"}
              </p>
              {member.email && (
                <p className="flex items-center gap-2">
                  <span className="text-red-500 font-bold">@</span> {member.email}
                  {hasLoginAccount ? (
                    <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Active Login</span>
                  ) : (
                    <span className="text-[9px] bg-red-950/80 text-red-400 border border-red-900 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">No Login Account</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex gap-2.5 mt-3.5">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${expiryInfo.badgeClass}`}>
                {expiryInfo.text}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-gray-900 border border-gray-800 text-gray-400">
                {member.plan}
              </span>
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
              <Edit3 size={14} /> Edit Member
            </button>

            {expiryInfo.type !== "active" && member.phone && (
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial bg-green-650 hover:bg-green-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <MessageSquare size={14} /> WhatsApp Reminder
              </a>
            )}

            <button 
              onClick={handleDeleteMember}
              className="flex-1 md:flex-initial bg-red-950/20 hover:bg-red-950/45 text-red-500 border border-red-900/60 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Trash2 size={14} /> Delete Member
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: STATS & PROGRESS */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          
          {/* Quick Stats */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-5 flex items-center gap-2">
              <Award className="text-red-500" size={18} /> Physical Profile
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-black/40 border border-gray-900 p-3.5 rounded-2xl">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Age</span>
                <strong className="text-white text-base block mt-1">{member.age || "N/A"} Yrs</strong>
              </div>
              <div className="bg-black/40 border border-gray-900 p-3.5 rounded-2xl">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Goal</span>
                <strong className="text-red-500 text-base block mt-1">{member.goal || "N/A"}</strong>
              </div>
              <div className="bg-black/40 border border-gray-900 p-3.5 rounded-2xl">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Height</span>
                <strong className="text-white text-base block mt-1">{member.height || "N/A"} cm</strong>
              </div>
              <div className="bg-black/40 border border-gray-900 p-3.5 rounded-2xl">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Weight</span>
                <strong className="text-white text-base block mt-1">{member.weight || "N/A"} kg</strong>
              </div>
              <div className="bg-black/40 border border-gray-900 p-3.5 rounded-2xl col-span-2">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Join Date</span>
                <strong className="text-white text-base block mt-1">{member.joinDate || "N/A"}</strong>
              </div>
            </div>
          </div>

          {/* Quick Renewal Card */}
          {userRole === "owner" && (
            <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
              <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
                <Calendar className="text-red-500" size={18} /> Renew Membership
              </h2>
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                Extend their active status. This updates their expiry date in Firestore.
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: "1 Month", val: 1 },
                  { label: "3 Months", val: 3 },
                  { label: "1 Year", val: 12 }
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => handleRenewMembership(opt.val)}
                    className="bg-black hover:bg-red-950/20 border border-gray-850 hover:border-red-900 text-xs font-semibold py-2.5 rounded-xl cursor-pointer text-white transition-all text-center"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress Photos */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <Camera className="text-red-500" size={18} /> Progress Photos
            </h2>

            {/* Input URL */}
            <form onSubmit={handleAddPhoto} className="flex gap-2 mb-4">
              <input
                type="url"
                placeholder="Paste progress photo URL..."
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                className="flex-1 bg-black border border-gray-850 rounded-xl p-2 outline-none focus:border-red-650 text-xs text-white"
              />
              <button 
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-xs font-bold px-3 rounded-xl cursor-pointer text-white"
              >
                Add
              </button>
            </form>

            {/* Local file upload */}
            <div className="mb-6">
              <label className="bg-black border border-dashed border-gray-800 hover:border-red-900/50 rounded-xl p-3 flex flex-col justify-center items-center text-xs text-gray-500 hover:text-gray-300 cursor-pointer transition-all">
                <Camera size={20} className="mb-1 text-gray-600" />
                <span>Upload progress image...</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLocalImageUpload}
                  className="hidden" 
                />
              </label>
            </div>

            {/* Image Grid */}
            {progressPhotos.length === 0 ? (
              <div className="text-center text-gray-600 text-xs italic py-4">No progress photos added.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 max-h-[250px] overflow-y-auto pr-1">
                {progressPhotos.map((img, idx) => (
                  <div key={idx} className="bg-black border border-gray-900 rounded-2xl overflow-hidden relative group">
                    <img 
                      src={img.url} 
                      alt={`Progress ${img.date}`} 
                      className="w-full h-24 object-cover"
                      onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400" }}
                    />
                    <span className="absolute bottom-1 right-2 bg-black/60 text-[9px] text-gray-400 font-bold px-1.5 py-0.5 rounded">
                      {img.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: TRAINING DETAILS & BILLING */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Training Routines */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-5 flex items-center gap-2">
              <Dumbbell className="text-red-500" size={18} /> Training Program
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="bg-black/40 border border-gray-900 p-4 rounded-2xl">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Assigned Trainer</span>
                <strong className="text-white text-base block mt-1.5">{member.assignedTrainer || "No Trainer Assigned"}</strong>
              </div>
              <div className="bg-black/40 border border-gray-900 p-4 rounded-2xl">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Workout Plan</span>
                <strong className="text-white text-base block mt-1.5">{member.workoutPlan || "No Workout Plan Assigned"}</strong>
              </div>
            </div>
          </div>

          {/* Attendance Stats */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-850 pb-3 mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarCheck className="text-red-500" size={18} /> Member Attendance
              </h2>
              <span className="text-xs bg-red-950/40 text-red-500 font-bold px-2.5 py-0.5 rounded-full border border-red-900">
                Attendance: {attendanceRate}%
              </span>
            </div>
            {attendance.length === 0 ? (
              <div className="p-4 text-center text-gray-600 text-xs italic">No attendance records logged.</div>
            ) : (
              <div className="max-h-[180px] overflow-y-auto pr-1">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-500 font-bold uppercase">
                      <th className="pb-3 w-1/2">Date</th>
                      <th className="pb-3 w-1/2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((item) => (
                      <tr key={item.id} className="border-t border-gray-900/60">
                        <td className="py-2.5 text-gray-300 font-semibold">{item.date}</td>
                        <td className="py-2.5">
                          <span className={`font-bold px-2 py-0.5 rounded-full uppercase text-[9px] ${
                            item.status === "Present" 
                              ? "bg-emerald-950/80 text-emerald-400" 
                              : "bg-red-950/80 text-red-400"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments Ledger */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-gray-850 pb-3 mb-5 flex items-center gap-2">
              <CreditCard className="text-red-500" size={18} /> Payments Log
            </h2>
            {payments.length === 0 ? (
              <div className="p-4 text-center text-gray-600 text-xs italic">No invoice log records found.</div>
            ) : (
              <div className="max-h-[180px] overflow-y-auto pr-1">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-500 font-bold uppercase">
                      <th className="pb-3 w-1/3">Amount</th>
                      <th className="pb-3 w-1/3">Payment Date</th>
                      <th className="pb-3 w-1/3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((invoice) => (
                      <tr key={invoice.id} className="border-t border-gray-900/60">
                        <td className="py-2.5 text-white font-bold">₹{Number(invoice.amount).toLocaleString()}</td>
                        <td className="py-2.5 text-gray-400">{invoice.paymentDate}</td>
                        <td className="py-2.5">
                          <span className={`font-bold px-2.5 py-0.5 rounded-full uppercase text-[9px] border ${
                            invoice.status === "Paid" 
                              ? "bg-emerald-950/80 text-emerald-400 border-emerald-900" 
                              : "bg-amber-950/80 text-amber-400 border-amber-900"
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes Log */}
          {userRole !== "member" && (
            <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-xl">
              <div className="flex justify-between items-center border-b border-gray-850 pb-3 mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="text-red-500" size={18} /> Staff Notes
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
                placeholder="Record member's preferences, injuries, scheduling details, or targets..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="4"
                className="w-full bg-black border border-gray-850 rounded-2xl p-4 outline-none focus:border-red-650 text-sm text-white resize-none leading-relaxed"
              />
            </div>
          )}

        </div>

      </div>

      {/* EDIT MEMBER PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveProfile}
            className="bg-[#111111] border border-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800 bg-[#151515] flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="text-red-650" size={20} /> Edit Member Profile
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
                  <label className="text-xs text-gray-500 font-bold uppercase">Member Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                  />
                </div>
                {!hasLoginAccount && editEmail.trim() !== "" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-bold uppercase">Temp Password (to create login account)</label>
                    <input
                      type="password"
                      placeholder="min 6 chars"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                      minLength={6}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Membership Plan</label>
                  {configuredPlans.length > 0 ? (
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white cursor-pointer"
                    >
                      {configuredPlans.map((p) => (
                        <option key={p.id} value={`${p.name} (${p.duration})`}>
                          {p.name} - ₹{p.price} ({p.duration})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Expiry Date</label>
                  <input
                    type="date"
                    value={editExpiry}
                    onChange={(e) => setEditExpiry(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white animate-pulse"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Age (Years)</label>
                  <input
                    type="number"
                    placeholder="e.g. 25"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Height (cm)</label>
                  <input
                    type="number"
                    placeholder="e.g. 175"
                    value={editHeight}
                    onChange={(e) => setEditHeight(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 70"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Assign Trainer</label>
                  <select
                    value={editTrainer}
                    onChange={(e) => setEditTrainer(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white cursor-pointer"
                  >
                    <option value="">-- Choose Trainer --</option>
                    {trainers.map((t) => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-bold uppercase">Assign Workout Program</label>
                  <select
                    value={editWorkoutPlan}
                    onChange={(e) => setEditWorkoutPlan(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white cursor-pointer"
                  >
                    <option value="">-- Choose Workout Plan --</option>
                    {workoutPlans.map((p) => (
                      <option key={p.id} value={p.planName}>{p.planName}</option>
                    ))}
                  </select>
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
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}

export default MemberProfile
