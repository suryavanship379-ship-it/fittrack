import { useEffect, useState } from "react"
import { 
  collection, addDoc, doc, deleteDoc, updateDoc, onSnapshot, getDocs 
} from "firebase/firestore"
import { db } from "../firebase"
import { 
  Trash2, MessageSquare, Edit2, Users, Search, Plus, 
  UserCheck, Clock, AlertTriangle, ShieldCheck, Mail, Phone 
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { validateForm } from "../services/api"

function Members() {
  const navigate = useNavigate()

  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  // Form input states
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [plan, setPlan] = useState("Gold Annual (1 Year)")
  const [expiry, setExpiry] = useState("")
  const [configuredPlans, setConfiguredPlans] = useState([
    { id: "1", name: "Gold Annual", duration: "1 Year", price: 9999 },
    { id: "2", name: "Monthly Basic", duration: "1 Month", price: 1499 }
  ])
  const [addingMember, setAddingMember] = useState(false)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Inline edit state variables
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPassword, setEditPassword] = useState("")
  const [editPlan, setEditPlan] = useState("")
  const [editExpiry, setEditExpiry] = useState("")
  const [userMappings, setUserMappings] = useState({})

  // Subscribe to real-time Firestore members collection
  useEffect(() => {
    setLoadingMembers(true)
    const unsubscribe = onSnapshot(collection(db, "members"), (snapshot) => {
      const membersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      setMembers(membersData)
      setLoadingMembers(false)
    }, (err) => {
      console.error("Firestore members subscription notice:", err)
      setLoadingMembers(false)
    })

    // Fetch user mappings to know which members have active login accounts
    const fetchUserMappings = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"))
        const mappings = {}
        usersSnap.docs.forEach((doc) => {
          const data = doc.data()
          if (data.memberId) {
            mappings[data.memberId] = { uid: doc.id, ...data }
          }
        })
        setUserMappings(mappings)
      } catch (err) {
        console.warn("Could not fetch user mappings notice:", err)
      }
    }
    fetchUserMappings()

    return () => unsubscribe()
  }, [])

  // Delete Member Document from Firestore
  const handleDeleteMember = async (id) => {
    if (window.confirm("Are you sure you want to delete this member?")) {
      try {
        await deleteDoc(doc(db, "members", id))
      } catch (error) {
        console.error("Error deleting member document: ", error)
        alert("Failed to delete member: " + error.message)
      }
    }
  }

  // Add Member Document to Firestore
  const handleAddMember = async (e) => {
    e.preventDefault()
    setError("")

    const nameErr = validateForm.required(name, "Full Name")
    if (nameErr) { setError(nameErr); return }

    const emailErr = validateForm.email(email)
    if (emailErr) { setError(emailErr); return }

    setAddingMember(true)

    try {
      let createdUid = ""
      // If password provided, create secondary Firebase Auth user
      if (password && password.length >= 6) {
        try {
          const { createSecondaryUser } = await import("../firebase")
          const { setDoc } = await import("firebase/firestore")
          createdUid = await createSecondaryUser(email.trim(), password)
        } catch (authErr) {
          console.warn("Secondary auth user creation notice:", authErr)
        }
      }

      // Create Member Document in Firestore `members` collection
      const memberRef = await addDoc(collection(db, "members"), {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        plan: plan,
        expiry: expiry || "2026-12-31",
        status: "Active",
        joinDate: new Date().toISOString().split("T")[0]
      })

      // Link User Mapping if Auth user created
      if (createdUid) {
        try {
          const { setDoc } = await import("firebase/firestore")
          await setDoc(doc(db, "users", createdUid), {
            uid: createdUid,
            name: name.trim(),
            email: email.trim(),
            role: "member",
            memberId: memberRef.id,
            createdAt: new Date().toISOString()
          })
        } catch (userErr) {
          console.warn("User profile doc creation notice:", userErr)
        }
      }

      setName("")
      setPhone("")
      setEmail("")
      setPassword("")
      setExpiry("")
      alert("Member added successfully!")
    } catch (err) {
      console.error("Add member error:", err)
      setError(err.message || "Failed to add member to database")
    } finally {
      setAddingMember(false)
    }
  }

  // Start Inline Edit Mode
  const startEditing = (member) => {
    setEditingId(member.id)
    setEditName(member.name)
    setEditPhone(member.phone || "")
    setEditEmail(member.email || "")
    setEditPassword("")
    setEditPlan(member.plan || "")
    setEditExpiry(member.expiry || "")
  }

  const cancelEditing = () => {
    setEditingId(null)
  }

  // Save Inline Edit to Firestore
  const handleSaveEdit = async (id) => {
    try {
      const linkedUser = userMappings[id]

      // Check if temporary password provided for account creation
      if (!linkedUser && editEmail.trim() !== "" && editPassword && editPassword.length >= 6) {
        try {
          const { createSecondaryUser } = await import("../firebase")
          const { setDoc } = await import("firebase/firestore")
          const uid = await createSecondaryUser(editEmail.trim(), editPassword)
          await setDoc(doc(db, "users", uid), {
            uid,
            name: editName.trim(),
            email: editEmail.trim(),
            role: "member",
            memberId: id,
            createdAt: new Date().toISOString()
          })
        } catch (authErr) {
          console.error("Auth creation failed during edit: ", authErr)
        }
      }

      // Update Firestore Member Document
      const updateData = {
        name: editName.trim(),
        phone: editPhone.trim(),
        plan: editPlan,
        expiry: editExpiry,
      }
      if (editEmail.trim() !== "") {
        updateData.email = editEmail.trim()
      }

      await updateDoc(doc(db, "members", id), updateData)
      setEditingId(null)
    } catch (error) {
      console.error("Error updating member details: ", error)
      alert("Error updating member: " + error.message)
    }
  }

  // Calculate Expiry Status
  const getExpiryStatus = (expiryDateStr) => {
    if (!expiryDateStr) {
      return {
        text: "Active",
        badgeClass: "bg-emerald-950/80 text-emerald-400 border border-emerald-900/80",
        showReminder: false,
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
        badgeClass: "bg-red-950/80 text-red-400 border border-red-900/80",
        showReminder: true,
      }
    } else if (diffDays <= 3) {
      return {
        text: "Expiring Soon",
        badgeClass: "bg-amber-950/80 text-amber-400 border border-amber-900/80",
        showReminder: true,
      }
    } else {
      return {
        text: "Active",
        badgeClass: "bg-emerald-950/80 text-emerald-400 border border-emerald-900/80",
        showReminder: false,
      }
    }
  }

  const getInitials = (fullName) => {
    if (!fullName) return "M"
    const parts = fullName.trim().split(" ")
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return fullName.substring(0, 2).toUpperCase()
  }

  // Filter members list based on search query
  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      (member.name && member.name.toLowerCase().includes(query)) ||
      (member.phone && member.phone.toLowerCase().includes(query)) ||
      (member.email && member.email.toLowerCase().includes(query)) ||
      (member.plan && member.plan.toLowerCase().includes(query))
    )
  })

  // Summary Metrics
  const totalCount = members.length
  const activeCount = members.filter(m => getExpiryStatus(m.expiry).text === "Active").length
  const expiringCount = members.filter(m => getExpiryStatus(m.expiry).text === "Expiring Soon").length
  const expiredCount = members.filter(m => getExpiryStatus(m.expiry).text === "Expired").length

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-10">
      {/* Hero Banner Section */}
      <div className="hero-banner">
        <div className="hero-content">
          <span className="hero-tag">Member Directory</span>
          <h1 className="hero-title">Gym <span className="text-red-600">Members</span></h1>
          <p className="hero-desc">
            Manage member accounts, track plan expirations, and send instant renewal reminders.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-800 text-red-300 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Members</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{totalCount}</div>
            <div className="text-gray-400 text-xs mt-1">Real Firestore Records</div>
          </div>
        </div>

        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Active Plans</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-950/20 border border-emerald-900/30 text-emerald-400">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{activeCount}</div>
            <div className="text-emerald-400 text-xs mt-1">Good standing</div>
          </div>
        </div>

        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Expiring Soon</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-950/20 border border-amber-900/30 text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{expiringCount}</div>
            <div className="text-amber-400 text-xs mt-1">Expires within 3 days</div>
          </div>
        </div>

        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Expired</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-400">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{expiredCount}</div>
            <div className="text-red-400 text-xs mt-1">Requires renewal</div>
          </div>
        </div>
      </div>

      {/* Add New Member Section */}
      <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-800/80">
          <Plus size={18} className="text-red-500" />
          <h2 className="text-lg font-bold text-white">Add New Member</h2>
        </div>

        <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Sanika Patel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 outline-none focus:border-red-600 text-sm text-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 outline-none focus:border-red-600 text-sm text-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="e.g. member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 outline-none focus:border-red-600 text-sm text-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Temporary Password (Optional)</label>
            <input
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 outline-none focus:border-red-600 text-sm text-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Membership Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              required
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 outline-none focus:border-red-600 text-sm text-gray-300 cursor-pointer transition-colors"
            >
              {configuredPlans.map((p) => (
                <option key={p.id} value={`${p.name} (${p.duration})`} className="bg-zinc-900 text-white">
                  {p.name} - ₹{p.price} ({p.duration})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Expiration Date</label>
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              required
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 outline-none focus:border-red-600 text-sm text-white transition-colors"
            />
          </div>

          <div className="lg:col-span-2 flex items-end">
            <button 
              disabled={addingMember}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-950 border border-red-600 rounded-xl font-semibold cursor-pointer text-sm text-white py-2.5 transition-all shadow-lg shadow-red-950/30 flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              {addingMember ? "Registering..." : "Add Member"}
            </button>
          </div>
        </form>
      </div>

      {/* Member Directory & Table Section */}
      <div className="bg-[#111111] rounded-2xl border border-gray-800 overflow-hidden shadow-xl flex flex-col">
        {/* Table Controls / Search Bar */}
        <div className="p-5 border-b border-gray-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141414]">
          <div>
            <h3 className="text-base font-bold text-white">Member Roster</h3>
            <p className="text-xs text-gray-400">Showing {filteredMembers.length} of {members.length} members</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-red-600 transition-colors"
            />
          </div>
        </div>

        {/* Members Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#18181b] border-b border-gray-800">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Member</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">WhatsApp Reminder</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-800/60">
              {loadingMembers ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Loading members from database...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                    {searchQuery ? "No members match your search query." : "No member records found. Add your first member above!"}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isEditing = editingId === member.id
                  const statusInfo = getExpiryStatus(isEditing ? editExpiry : member.expiry)
                  const cleanPhone = member.phone ? member.phone.replace(/\D/g, "") : ""
                  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
                  const message = `Hello ${member.name}, your FitTrack gym membership is expiring soon on ${member.expiry}. Please renew to continue your fitness journey.`
                  const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`

                  return (
                    <tr 
                      key={member.id} 
                      className={`transition-colors ${isEditing ? "bg-red-950/10" : "hover:bg-white/[0.02] cursor-pointer"}`}
                      onClick={isEditing ? null : () => navigate(`/members/${member.id}`)}
                    >
                      {isEditing ? (
                        <>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-black border border-gray-700 rounded-xl px-3 py-1.5 outline-none focus:border-red-600 text-sm w-full text-white"
                              required
                            />
                          </td>

                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-1.5">
                              <input
                                type="tel"
                                placeholder="Phone"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="bg-black border border-gray-700 rounded-xl px-3 py-1.5 outline-none focus:border-red-600 text-sm w-full text-white"
                              />
                              <input
                                type="email"
                                placeholder="Email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="bg-black border border-gray-700 rounded-xl px-3 py-1.5 outline-none focus:border-red-600 text-xs w-full text-white"
                              />
                            </div>
                          </td>

                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={editPlan}
                              onChange={(e) => setEditPlan(e.target.value)}
                              required
                              className="bg-black border border-gray-700 rounded-xl px-3 py-1.5 outline-none focus:border-red-600 text-sm w-full cursor-pointer text-white"
                            >
                              {configuredPlans.map((p) => (
                                <option key={p.id} value={`${p.name} (${p.duration})`} className="bg-zinc-900 text-white">
                                  {p.name} ({p.duration})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="date"
                              value={editExpiry}
                              onChange={(e) => setEditExpiry(e.target.value)}
                              className="bg-black border border-gray-700 rounded-xl px-3 py-1.5 outline-none focus:border-red-600 text-sm w-full text-white"
                              required
                            />
                          </td>

                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${statusInfo.badgeClass}`}>
                              {statusInfo.text}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-xs text-gray-500 italic" onClick={(e) => e.stopPropagation()}>
                            Editing record...
                          </td>

                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleSaveEdit(member.id)}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Member Column with Avatar */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-red-950/50 border border-red-900/60 text-red-500 font-bold flex items-center justify-center shrink-0 text-sm shadow-sm">
                                {getInitials(member.name)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-white hover:text-red-400 transition-colors">
                                  {member.name}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  Joined {member.joinDate || "2026-01-01"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info Column */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-gray-300 flex items-center gap-1">
                                <Phone size={11} className="text-gray-500" />
                                {member.phone || "N/A"}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Mail size={11} className="text-gray-500" />
                                {member.email || "N/A"}
                              </span>
                            </div>
                          </td>

                          {/* Plan Column */}
                          <td className="px-6 py-4">
                            <span className="inline-block text-xs font-semibold text-gray-300 bg-white/5 border border-gray-800 px-2.5 py-1 rounded-lg">
                              {member.plan || "Gold Annual"}
                            </span>
                          </td>

                          {/* Expiry Column */}
                          <td className="px-6 py-4 text-xs font-medium text-gray-300">
                            {member.expiry || "2026-12-31"}
                          </td>

                          {/* Status Badge Column */}
                          <td className="px-6 py-4">
                            <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${statusInfo.badgeClass}`}>
                              {statusInfo.text}
                            </span>
                          </td>

                          {/* WhatsApp Reminder Column */}
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            {statusInfo.showReminder ? (
                              member.phone ? (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
                                >
                                  <MessageSquare size={13} />
                                  Send WhatsApp Reminder
                                </a>
                              ) : (
                                <span className="text-gray-500 text-xs italic">No phone saved</span>
                              )
                            ) : (
                              <span className="text-emerald-500/80 text-xs font-medium flex items-center gap-1">
                                <ShieldCheck size={14} /> Active
                              </span>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEditing(member)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                title="Edit Member"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteMember(member.id)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Delete Member"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Members