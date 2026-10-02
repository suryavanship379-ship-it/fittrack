import { useEffect, useState } from "react"
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../firebase"
import { useNavigate } from "react-router-dom"
import { 
  Trash2, TrendingUp, DollarSign, Clock, AlertCircle, 
  ArrowUpRight, ArrowDownLeft, CreditCard, Calendar, BarChart2 
} from "lucide-react"

function Payments() {
  const navigate = useNavigate()

  const [payments, setPayments] = useState([])
  const [memberName, setMemberName] = useState("")
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState("Paid")
  const [paymentDate, setPaymentDate] = useState("")

  const fetchPayments = async () => {
    const querySnapshot = await getDocs(collection(db, "payments"))

    const paymentsData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    setPayments(paymentsData)
  }

  const handleUpdatePaymentStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "payments", id), {
        status: newStatus,
      })
      fetchPayments()
    } catch (error) {
      console.error("Error updating payment status: ", error)
    }
  }

  const handleDeletePayment = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment record?")) {
      try {
        await deleteDoc(doc(db, "payments", id))
        fetchPayments()
      } catch (error) {
        console.error("Error deleting payment record: ", error)
      }
    }
  }

  const handleAddPayment = async (e) => {
    e.preventDefault()

    await addDoc(collection(db, "payments"), {
      memberName,
      amount,
      status,
      paymentDate,
    })

    setMemberName("")
    setAmount("")
    setStatus("Paid")
    setPaymentDate("")

    fetchPayments()
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const totalRevenue = payments
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const pendingPayments = payments
    .filter((p) => p.status === "Pending")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const currentMonthStr = new Date().toISOString().substring(0, 7) // "YYYY-MM"
  const paidThisMonth = payments
    .filter((p) => p.status === "Paid" && p.paymentDate?.startsWith(currentMonthStr))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const membersDue = payments.filter((p) => p.status === "Pending" || p.status === "Overdue").length

  // Filter 5 most recent transactions
  const recentTransactions = [...payments]
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
    .slice(0, 5)

  // Monthly revenue calculations for last 6 months
  const getMonthlyRevenueData = () => {
    const months = []
    const today = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthStr = d.toISOString().substring(0, 7) // "YYYY-MM"
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" })
      months.push({ monthStr, label, amount: 0 })
    }

    payments.forEach((payment) => {
      if (payment.status === "Paid" && payment.paymentDate) {
        const monthKey = payment.paymentDate.substring(0, 7)
        const found = months.find((m) => m.monthStr === monthKey)
        if (found) {
          found.amount += Number(payment.amount || 0)
        }
      }
    })

    return months
  }

  const monthlyData = getMonthlyRevenueData()
  const maxAmount = Math.max(...monthlyData.map((d) => d.amount), 1)

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-10">
      {/* Hero Banner Section */}
      <div className="hero-banner">
        <div className="hero-content">
          <span className="hero-tag">Payments Ledger</span>
          <h1 className="hero-title">Gym <span className="text-red-600">Payments</span></h1>
          <p className="hero-desc">
            Track revenue, pending fees, and member subscriptions.
          </p>
        </div>
      </div>

      {/* Revenue Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">₹{totalRevenue.toLocaleString()}</div>
            <div className="stat-trend positive text-emerald-500 text-xs mt-1">
              <span>All-time completed payments</span>
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Pending Payments</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">₹{pendingPayments.toLocaleString()}</div>
            <div className="stat-trend negative text-amber-500 text-xs mt-1">
              <span>Unpaid balance in ledger</span>
            </div>
          </div>
        </div>

        {/* Paid This Month */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Paid This Month</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">₹{paidThisMonth.toLocaleString()}</div>
            <div className="stat-trend positive text-emerald-500 text-xs mt-1">
              <span>Revenue collected this month</span>
            </div>
          </div>
        </div>

        {/* Members Due */}
        <div className="stat-card flex flex-col justify-between p-6 rounded-2xl bg-[#111111] border border-gray-800">
          <div className="stat-header flex justify-between items-center w-full">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Members Due</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-500">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="stat-content mt-4">
            <div className="stat-value text-3xl font-extrabold text-white">{membersDue}</div>
            <div className="stat-trend text-red-500 text-xs mt-1">
              <span>Pending or overdue fees</span>
            </div>
          </div>
        </div>
      </div>

      {/* Record transaction form */}
      <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-2xl">
        <h3 className="text-sm font-bold text-red-655 text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
          <CreditCard size={16} /> Record Gym Transaction
        </h3>
        <form onSubmit={handleAddPayment} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Member Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              required
              className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount (₹)</label>
            <input
              type="number"
              placeholder="e.g. 1500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white cursor-pointer w-full"
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-600 text-sm text-white w-full"
            />
          </div>

          <button className="bg-red-600 hover:bg-red-700 text-black font-extrabold rounded-xl py-3 text-sm tracking-wider uppercase cursor-pointer w-full transition-all active:scale-95 shadow-md shadow-red-950/20">
            Add Payment
          </button>
        </form>
      </div>

      {/* 2-Column Dashboard Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Side: Table Ledger (2/3 width) */}
        <div className="flex-1 w-full flex flex-col gap-6">
          <div className="bg-[#111111] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
            <div className="bg-black/20 p-5 border-b border-gray-900 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CreditCard size={18} className="text-red-500" /> Transactions Ledger
              </h3>
              <span className="text-xs text-gray-400 bg-black/60 px-3 py-1 rounded-full border border-gray-855">
                Total Records: {payments.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#151515] text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-855">
                  <tr>
                    <th className="p-5 text-left">Member Name</th>
                    <th className="p-5 text-left">Amount</th>
                    <th className="p-5 text-left">Status</th>
                    <th className="p-5 text-left">Date</th>
                    <th className="p-5 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-10 text-center text-gray-500 text-xs italic">
                        No transactions registered yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id} className="border-t border-gray-900 hover:bg-white/[0.01] transition-colors">
                        <td className="p-5 font-semibold text-white">{payment.memberName}</td>
                        <td className="p-5 text-sm font-bold text-gray-200">₹{Number(payment.amount || 0).toLocaleString()}</td>
                        <td className="p-5">
                          <select
                            value={payment.status}
                            onChange={(e) => handleUpdatePaymentStatus(payment.id, e.target.value)}
                            className={`border rounded-full px-3.5 py-1.5 outline-none font-bold text-[9px] uppercase cursor-pointer transition-all ${
                              payment.status === "Paid"
                                ? "bg-emerald-950/80 text-emerald-400 border-emerald-900"
                                : payment.status === "Overdue"
                                ? "bg-red-950/80 text-red-400 border-red-900"
                                : "bg-amber-950/80 text-amber-400 border-amber-900"
                            }`}
                          >
                            <option value="Paid" className="bg-[#111111] text-emerald-400 font-bold">Paid</option>
                            <option value="Pending" className="bg-[#111111] text-amber-400 font-bold">Pending</option>
                            <option value="Overdue" className="bg-[#111111] text-red-400 font-bold">Overdue</option>
                          </select>
                        </td>
                        <td className="p-5 text-gray-400 text-sm">{payment.paymentDate}</td>
                        <td className="p-5">
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-gray-500 hover:text-red-500 transition-all p-1.5 cursor-pointer"
                            title="Delete Payment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Charts & Recent panel (1/3 width) */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
          {/* Revenue Analytics chart */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 size={16} className="text-red-500" /> Revenue Analytics
            </h3>
            
            {/* Custom Bar chart display */}
            <div className="flex justify-between items-end gap-3.5 h-44 pt-6 pb-2 border-b border-gray-900">
              {monthlyData.map((item) => {
                const heightPercent = maxAmount > 1 ? (item.amount / maxAmount) * 100 : 0
                return (
                  <div key={item.monthStr} className="flex flex-col items-center gap-2 flex-1 group relative">
                    {/* Bar graphic */}
                    <div className="h-28 w-full bg-black/40 border border-gray-900 rounded-md flex items-end overflow-hidden relative">
                      <div 
                        style={{ height: `${heightPercent || 5}%` }} 
                        className={`w-full ${heightPercent > 0 ? "bg-red-655 bg-red-600" : "bg-gray-950"} rounded-b-sm relative transition-all duration-500 group-hover:opacity-85`}
                      >
                        {heightPercent > 0 && (
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
                        )}
                      </div>
                    </div>
                    {/* Month name label */}
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{item.label}</span>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-black border border-gray-800 px-2 py-1 rounded-lg text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-xl">
                      ₹{item.amount.toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="text-[10px] text-gray-500 leading-normal flex items-start gap-1.5 mt-1">
              <TrendingUp size={12} className="text-red-500 shrink-0 mt-0.5" />
              <span>Paid monthly check-ins aggregated automatically from Firestore.</span>
            </div>
          </div>

          {/* Recent transactions vertical list panel */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-red-500" /> Recent Activity
            </h3>

            <div className="flex flex-col gap-3.5">
              {recentTransactions.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-4 text-center">No transactions recorded.</p>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center gap-3 bg-black/30 border border-gray-900/60 p-3 rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.status === "Paid" 
                          ? "bg-emerald-950/40 border border-emerald-900/40 text-emerald-500"
                          : tx.status === "Overdue"
                          ? "bg-red-950/40 border border-red-900/40 text-red-500"
                          : "bg-amber-950/40 border border-amber-900/40 text-amber-500"
                      }`}>
                        {tx.status === "Paid" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">{tx.memberName}</span>
                        <span className="text-[9px] text-gray-500">{tx.paymentDate}</span>
                      </div>
                    </div>
                    
                    <span className={`text-xs font-extrabold shrink-0 ${
                      tx.status === "Paid" ? "text-emerald-400" : "text-gray-400"
                    }`}>
                      ₹{Number(tx.amount || 0).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Payments