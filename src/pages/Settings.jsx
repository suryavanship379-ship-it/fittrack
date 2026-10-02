import { useEffect, useState } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "../firebase"
import { Settings as SettingsIcon, Save, Plus, Trash2, Award } from "lucide-react"

function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")

  // Gym Profile states
  const [gymName, setGymName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [gst, setGst] = useState("")

  // Plans manager states
  const [plans, setPlans] = useState([])
  const [newPlanName, setNewPlanName] = useState("")
  const [newPlanPrice, setNewPlanPrice] = useState("")
  const [newPlanDuration, setNewPlanDuration] = useState("1 Month")

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const docRef = doc(db, "settings", "gym")
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data()
        setGymName(data.gymName || "")
        setLogoUrl(data.logoUrl || "")
        setPhone(data.phone || "")
        setAddress(data.address || "")
        setGst(data.gst || "")
        setPlans(data.plans || [])
      }
    } catch (error) {
      console.error("Error loading gym settings: ", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg("")

    try {
      const docRef = doc(db, "settings", "gym")
      await setDoc(docRef, {
        gymName,
        logoUrl,
        phone,
        address,
        gst,
        plans // keep existing plans
      }, { merge: true })

      setSuccessMsg("Gym profile updated successfully!")
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch (error) {
      console.error("Error saving gym settings: ", error)
      alert("Failed to save gym settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleAddPlan = async (e) => {
    e.preventDefault()
    if (!newPlanName || !newPlanPrice) return

    const newPlan = {
      id: Date.now().toString(),
      name: newPlanName,
      price: Number(newPlanPrice),
      duration: newPlanDuration
    }

    const updatedPlans = [...plans, newPlan]
    setPlans(updatedPlans)

    // Save automatically to Firestore
    try {
      const docRef = doc(db, "settings", "gym")
      await setDoc(docRef, { plans: updatedPlans }, { merge: true })
      setNewPlanName("")
      setNewPlanPrice("")
      setNewPlanDuration("1 Month")
      
      setSuccessMsg("Membership plan added!")
      setTimeout(() => setSuccessMsg(""), 2000)
    } catch (error) {
      console.error("Error adding membership plan: ", error)
      alert("Failed to add plan. Please try again.")
    }
  }

  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this membership plan?")) return

    const updatedPlans = plans.filter(p => p.id !== planId)
    setPlans(updatedPlans)

    try {
      const docRef = doc(db, "settings", "gym")
      await setDoc(docRef, { plans: updatedPlans }, { merge: true })
      
      setSuccessMsg("Membership plan removed!")
      setTimeout(() => setSuccessMsg(""), 2000)
    } catch (error) {
      console.error("Error deleting membership plan: ", error)
      alert("Failed to delete plan. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      
      {/* Header */}
      <div className="border-b border-gray-900 pb-6 mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl flex items-center gap-3">
            <SettingsIcon className="text-red-600 animate-spin-slow" size={36} />
            Gym <span className="text-red-600">Settings</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            Configure system rules, brand parameters, GST numbers, and active membership plans.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-950/80 border border-emerald-900 text-emerald-400 font-bold rounded-2xl text-sm text-center animate-pulse">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="min-h-[300px] flex flex-col justify-center items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm">Loading config from Firestore...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          
          {/* Gym Profile Form */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-900 shadow-2xl">
            <h2 className="text-xl font-bold border-b border-gray-900 pb-3 mb-6 flex items-center gap-2 text-white">
              <Award className="text-red-600" size={20} /> Gym Profile & Branding
            </h2>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Gym Name</label>
                <input
                  type="text"
                  placeholder="e.g. FitTrack Elite Gym"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  required
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Logo Image URL</label>
                <input
                  type="url"
                  placeholder="e.g. https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 tracking-wider uppercase">GST Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    value={gst}
                    onChange={(e) => setGst(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Address</label>
                <textarea
                  placeholder="Enter complete gym address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  rows="3"
                  className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white resize-none transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 transition-all rounded-xl py-3 mt-2 text-sm font-bold tracking-wider uppercase flex justify-center items-center gap-2 cursor-pointer shadow-lg shadow-red-950/20 text-white"
              >
                <Save size={16} />
                {saving ? "Saving Details..." : "Save Gym Profile"}
              </button>
            </form>
          </div>

          {/* Membership Plans Configuration */}
          <div className="flex flex-col gap-6">
            
            {/* Add New Plan Form */}
            <div className="bg-[#111111] p-6 rounded-3xl border border-gray-900 shadow-2xl">
              <h2 className="text-xl font-bold border-b border-gray-900 pb-3 mb-6 flex items-center gap-2 text-white">
                <Plus className="text-red-600" size={20} /> Create New Plan
              </h2>

              <form onSubmit={handleAddPlan} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Plan Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Premium Annual"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 9999"
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(e.target.value)}
                    required
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Validity / Duration</label>
                  <select
                    value={newPlanDuration}
                    onChange={(e) => setNewPlanDuration(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white cursor-pointer transition-all"
                  >
                    <option value="1 Month">1 Month</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="1 Year">1 Year</option>
                    <option value="2 Years">2 Years</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="bg-red-650 hover:bg-red-700 md:col-span-3 transition-all rounded-xl py-3 mt-2 text-sm font-bold tracking-wider uppercase flex justify-center items-center gap-1 cursor-pointer text-white"
                >
                  <Plus size={16} /> Add Membership Plan
                </button>
              </form>
            </div>

            {/* List Configured Plans */}
            <div className="bg-[#111111] p-6 rounded-3xl border border-gray-900 shadow-2xl">
              <h2 className="text-xl font-bold border-b border-gray-900 pb-3 mb-4 text-white">
                Active Membership Plans ({plans.length})
              </h2>

              {plans.length === 0 ? (
                <div className="p-8 text-center text-gray-600 text-xs italic">
                  No plans configured. Create one above to link it with member registration.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                  {plans.map(p => (
                    <div key={p.id} className="bg-black border border-gray-850 hover:border-red-950 p-4 rounded-2xl flex justify-between items-center transition-all">
                      <div>
                        <strong className="text-sm text-white block">{p.name}</strong>
                        <span className="text-xs text-red-500 font-bold block mt-1">₹{Number(p.price).toLocaleString()}</span>
                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mt-0.5">{p.duration}</span>
                      </div>
                      <button
                        onClick={() => handleDeletePlan(p.id)}
                        className="text-gray-500 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-950/20 transition-all cursor-pointer"
                        title="Delete Plan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  )
}

export default Settings
