import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { 
  BarChart3, 
  Users, 
  UserCheck, 
  CreditCard, 
  CalendarCheck, 
  TrendingUp, 
  Download, 
  Printer, 
  Search, 
  Calendar, 
  ShieldAlert, 
  Award,
  AlertTriangle
} from "lucide-react"

function Reports() {
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [trainers, setTrainers] = useState([])
  const [payments, setPayments] = useState([])
  const [attendance, setAttendance] = useState([])

  const [activeTab, setActiveTab] = useState("dashboard")

  // Filter States
  const [membersSearch, setMembersSearch] = useState("")
  const [membersFilter, setMembersFilter] = useState("all") // all, active, expired, expiring_soon

  const [trainersSearch, setTrainersSearch] = useState("")

  const [paymentsSearch, setPaymentsSearch] = useState("")
  const [paymentsFilter, setPaymentsFilter] = useState("all") // all, paid, pending

  const [attendanceStartDate, setAttendanceStartDate] = useState("")
  const [attendanceEndDate, setAttendanceEndDate] = useState("")
  const [attendanceSearch, setAttendanceSearch] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const [membersSnap, trainersSnap, paymentsSnap, attendanceSnap] = await Promise.all([
        getDocs(collection(db, "members")),
        getDocs(collection(db, "trainers")),
        getDocs(collection(db, "payments")),
        getDocs(collection(db, "attendance"))
      ])

      const membersData = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const trainersData = trainersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const paymentsData = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const attendanceData = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      setMembers(membersData)
      setTrainers(trainersData)
      setPayments(paymentsData)
      setAttendance(attendanceData)
    } catch (err) {
      console.error("Error loading reports data: ", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Dynamic Helper: Expiry Status
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
        badgeClass: "bg-red-950/80 text-red-400 border border-red-900",
        type: "expired",
        daysRemaining: diffDays
      }
    } else if (diffDays <= 3) {
      return {
        text: "Expiring Soon (3d)",
        badgeClass: "bg-amber-950/80 text-amber-400 border border-amber-900/60",
        type: "expiring_soon",
        daysRemaining: diffDays
      }
    } else if (diffDays <= 7) {
      return {
        text: "Expiring Soon (7d)",
        badgeClass: "bg-amber-900/20 text-amber-400 border border-amber-800/40",
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

  // --- STATS CALCULATIONS ---

  const totalMembersCount = members.length
  const activeMembersCount = members.filter(m => getExpiryStatus(m.expiry).type === "active").length
  const expiredMembersCount = members.filter(m => getExpiryStatus(m.expiry).type === "expired").length
  const expiringSoonMembersCount = members.filter(m => getExpiryStatus(m.expiry).type === "expiring_soon").length
  const totalTrainersCount = trainers.length

  const totalRevenue = payments
    .filter(p => p.status === "Paid")
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)

  const pendingFees = payments
    .filter(p => p.status === "Pending")
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)

  // Current Month Paid Revenue
  const currentMonthPaidRevenue = payments
    .filter(p => {
      if (p.status !== "Paid" || !p.paymentDate) return false
      const pDate = new Date(p.paymentDate)
      const now = new Date()
      return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear()
    })
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)

  // Today's Attendance
  const getTodayDateStr = () => {
    const d = new Date()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${month}-${day}`
  }
  const todayAttendanceCount = attendance.filter(a => a.date === getTodayDateStr() && a.status === "Present").length

  // Trainer Salary Stats
  const paidSalaries = trainers
    .filter(t => t.paymentStatus === "Paid")
    .reduce((acc, curr) => acc + Number(curr.salary || 0), 0)
  
  const pendingSalaries = trainers
    .filter(t => t.paymentStatus === "Pending")
    .reduce((acc, curr) => acc + Number(curr.salary || 0), 0)

  const totalSalaryExpense = trainers
    .reduce((acc, curr) => acc + Number(curr.salary || 0), 0)

  // --- EXPORT HANDLERS ---

  const exportCSV = (headers, rows, filename) => {
    const escapeCsv = (val) => {
      if (val === undefined || val === null) return ""
      const stringVal = String(val)
      if (stringVal.includes(",") || stringVal.includes('"') || stringVal.includes("\n")) {
        return `"${stringVal.replace(/"/g, '""')}"`
      }
      return stringVal
    }

    const csvRows = [
      headers.map(escapeCsv).join(","),
      ...rows.map(row => row.map(escapeCsv).join(","))
    ]
    const csvContent = "\uFEFF" + csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportPDF = (title, headers, rows) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Popup blocker active! Please allow popups to export printable reports.")
      return
    }

    const htmlContent = `
      <html>
        <head>
          <title>FitTrack Report - ${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #111827;
              padding: 40px;
              background-color: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #ef4444;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .logo {
              font-size: 22px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: -0.05em;
            }
            .logo-red { color: #dc2626; }
            .title { font-size: 18px; font-weight: 700; margin: 0; }
            .meta { font-size: 11px; color: #4b5563; margin-bottom: 20px; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 12px;
            }
            th {
              background-color: #f3f4f6;
              color: #374151;
              font-weight: 600;
              text-align: left;
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
              color: #4b5563;
            }
            tr:nth-child(even) td { background-color: #f9fafb; }
            .badge {
              font-size: 10px;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 9999px;
              text-transform: uppercase;
            }
            .badge-active { background-color: #d1fae5; color: #065f46; }
            .badge-soon { background-color: #fef3c7; color: #92400e; }
            .badge-expired { background-color: #fee2e2; color: #991b1b; }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
              font-size: 11px;
              color: #9ca3af;
              text-align: center;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">FIT<span class="logo-red">TRACK</span> GYM</div>
            <div><h1 class="title">${title}</h1></div>
          </div>
          <div class="meta">
            <strong>Date Generated:</strong> ${new Date().toLocaleString()}<br>
            <strong>Generated By:</strong> Gym SaaS Reporting Module
          </div>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  ${row.map(cell => {
                    const lowerCell = String(cell).toLowerCase().trim()
                    if (lowerCell === "active") return `<td><span class="badge badge-active">Active</span></td>`
                    if (lowerCell.startsWith("expiring soon")) return `<td><span class="badge badge-soon">Expiring Soon</span></td>`
                    if (lowerCell === "expired") return `<td><span class="badge badge-expired">Expired</span></td>`
                    return `<td>${cell}</td>`
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="footer">
            FITTRACK Admin Reports &copy; 2026. All rights reserved.
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const exportFullReportPDF = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Popup blocker active! Please allow popups to export printable reports.")
      return
    }

    const renderTableHTML = (headers, rows) => `
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map(cell => {
                const lowerCell = String(cell).toLowerCase().trim()
                if (lowerCell === "active") return `<td><span class="badge badge-active">Active</span></td>`
                if (lowerCell.startsWith("expiring soon")) return `<td><span class="badge badge-soon">Expiring Soon</span></td>`
                if (lowerCell === "expired") return `<td><span class="badge badge-expired">Expired</span></td>`
                return `<td>${cell}</td>`
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `

    const htmlContent = `
      <html>
        <head>
          <title>FitTrack System - Full Audit Report</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #111827;
              padding: 40px;
              background-color: #ffffff;
            }
            .page { page-break-after: always; }
            .page:last-child { page-break-after: avoid; }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #ef4444;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .logo {
              font-size: 22px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: -0.05em;
            }
            .logo-red { color: #dc2626; }
            .title { font-size: 18px; font-weight: 700; margin: 0; }
            .meta { font-size: 11px; color: #4b5563; margin-bottom: 25px; }
            .section-title {
              font-size: 15px;
              font-weight: 700;
              margin-top: 30px;
              margin-bottom: 15px;
              color: #111827;
              border-left: 4px solid #dc2626;
              padding-left: 10px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              margin-bottom: 30px;
            }
            th {
              background-color: #f3f4f6;
              color: #374151;
              font-weight: 600;
              text-align: left;
              padding: 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #e5e7eb;
              color: #4b5563;
            }
            tr:nth-child(even) td { background-color: #f9fafb; }
            .badge {
              font-size: 9px;
              font-weight: 700;
              padding: 2px 5px;
              border-radius: 9999px;
              text-transform: uppercase;
            }
            .badge-active { background-color: #d1fae5; color: #065f46; }
            .badge-soon { background-color: #fef3c7; color: #92400e; }
            .badge-expired { background-color: #fee2e2; color: #991b1b; }
            .summary-grid {
              display: grid;
              grid-template-cols: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 25px;
            }
            .summary-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 12px;
              background-color: #f9fafb;
            }
            .summary-label { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
            .summary-val { font-size: 18px; font-weight: 700; color: #111827; margin-top: 5px; }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
              font-size: 11px;
              color: #9ca3af;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <!-- Page 1: Overview Summary Audit -->
          <div class="page">
            <div class="header">
              <div class="logo">FIT<span class="logo-red">TRACK</span> GYM</div>
              <div><h1 class="title">Full Performance Overview & KPIs</h1></div>
            </div>
            <div class="meta">
              <strong>Report Generated:</strong> ${new Date().toLocaleString()}<br>
              <strong>Status:</strong> Complete System Audit
            </div>

            <div class="section-title">Members & Staff Metrics</div>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-label">Total Members</div>
                <div class="summary-val">${totalMembersCount}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Active Members</div>
                <div class="summary-val">${activeMembersCount}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Expired Members</div>
                <div class="summary-val">${expiredMembersCount}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Gym Trainers</div>
                <div class="summary-val">${totalTrainersCount}</div>
              </div>
            </div>

            <div class="section-title">Financial Metrics</div>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-label">Total Revenue Collected</div>
                <div class="summary-val">₹${totalRevenue}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Pending Collection</div>
                <div class="summary-val">₹${pendingFees}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Salaries Expense</div>
                <div class="summary-val">₹${totalSalaryExpense}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Salary Pending</div>
                <div class="summary-val">₹${pendingSalaries}</div>
              </div>
            </div>
            <div class="footer">Page 1 of 5 &bull; FITTRACK Gym SaaS Platform</div>
          </div>

          <!-- Page 2: Members List -->
          <div class="page">
            <div class="header">
              <div class="logo">FIT<span class="logo-red">TRACK</span> GYM</div>
              <div><h1 class="title">Gym Members Directory</h1></div>
            </div>
            <div class="section-title">Members Table (${members.length} records)</div>
            ${renderTableHTML(
              ["Name", "Phone", "Plan", "Expiry", "Status", "Join Date"],
              members.map(m => [m.name, m.phone || "N/A", m.plan, m.expiry, getExpiryStatus(m.expiry).text, m.joinDate || "2026-05-01"])
            )}
            <div class="footer">Page 2 of 5 &bull; FITTRACK Gym SaaS Platform</div>
          </div>

          <!-- Page 3: Trainers List -->
          <div class="page">
            <div class="header">
              <div class="logo">FIT<span class="logo-red">TRACK</span> GYM</div>
              <div><h1 class="title">Staff & Trainers Directory</h1></div>
            </div>
            <div class="section-title">Trainers Table (${trainers.length} records)</div>
            ${renderTableHTML(
              ["Trainer Name", "Phone", "Experience", "Salary", "Salary Status", "Assigned Members Count"],
              trainers.map(t => [t.name, t.phone, `${t.experience} Years`, `₹${t.salary}`, t.paymentStatus || "Pending", t.assignedMembers?.length || 0])
            )}
            <div class="footer">Page 3 of 5 &bull; FITTRACK Gym SaaS Platform</div>
          </div>

          <!-- Page 4: Payments Log -->
          <div class="page">
            <div class="header">
              <div class="logo">FIT<span class="logo-red">TRACK</span> GYM</div>
              <div><h1 class="title">Payments & Billings History</h1></div>
            </div>
            <div class="section-title">Payments Log (${payments.length} invoices)</div>
            ${renderTableHTML(
              ["Member Name", "Amount", "Date", "Status"],
              payments.map(p => [p.memberName, `₹${p.amount}`, p.paymentDate, p.status])
            )}
            <div class="footer">Page 4 of 5 &bull; FITTRACK Gym SaaS Platform</div>
          </div>

          <!-- Page 5: Attendance Report -->
          <div class="page">
            <div class="header">
              <div class="logo">FIT<span class="logo-red">TRACK</span> GYM</div>
              <div><h1 class="title">Attendance Auditing Logs</h1></div>
            </div>
            <div class="section-title">Attendance Entries (${attendance.length} items)</div>
            ${renderTableHTML(
              ["Member Name", "Date", "Status"],
              attendance.map(a => [a.memberName, a.date, a.status])
            )}
            <div class="footer">Page 5 of 5 &bull; FITTRACK Gym SaaS Platform</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  // --- FILTERS & SEARCH PROCESSORS ---

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(membersSearch.toLowerCase()) || 
                          (m.phone || "").includes(membersSearch)
    
    const expiryInfo = getExpiryStatus(m.expiry)
    let matchesStatus = true
    if (membersFilter === "active") matchesStatus = (expiryInfo.type === "active")
    if (membersFilter === "expired") matchesStatus = (expiryInfo.type === "expired")
    if (membersFilter === "expiring_soon") matchesStatus = (expiryInfo.type === "expiring_soon")

    return matchesSearch && matchesStatus
  })

  const filteredTrainers = trainers.filter(t => 
    t.name.toLowerCase().includes(trainersSearch.toLowerCase()) || 
    t.phone.includes(trainersSearch)
  )

  const filteredPayments = payments.filter(p => {
    const matchesSearch = (p.memberName || "").toLowerCase().includes(paymentsSearch.toLowerCase())
    let matchesStatus = true
    if (paymentsFilter === "paid") matchesStatus = (p.status === "Paid")
    if (paymentsFilter === "pending") matchesStatus = (p.status === "Pending")

    return matchesSearch && matchesStatus
  })

  const filteredAttendance = attendance.filter(a => {
    const matchesSearch = (a.memberName || "").toLowerCase().includes(attendanceSearch.toLowerCase())
    
    let matchesDate = true
    if (attendanceStartDate) {
      matchesDate = matchesDate && (a.date >= attendanceStartDate)
    }
    if (attendanceEndDate) {
      matchesDate = matchesDate && (a.date <= attendanceEndDate)
    }

    return matchesSearch && matchesDate
  })

  // Attendance metrics for the current filtered scope
  const attendancePresentCount = filteredAttendance.filter(a => a.status === "Present").length
  const attendanceAbsentCount = filteredAttendance.filter(a => a.status === "Absent").length
  const attendancePercentage = filteredAttendance.length > 0 
    ? Math.round((attendancePresentCount / filteredAttendance.length) * 100)
    : 0

  // --- CHART DATA GENERATORS ---

  // 1. Revenue by Month
  const getRevenueChartData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const monthTotals = Array(12).fill(0)
    
    payments.forEach(p => {
      if (p.status === "Paid" && p.paymentDate) {
        const date = new Date(p.paymentDate)
        if (!isNaN(date.getTime())) {
          monthTotals[date.getMonth()] += Number(p.amount || 0)
        }
      }
    })

    const maxTotal = Math.max(...monthTotals, 1000)
    return { months, monthTotals, maxTotal }
  }
  const revenueChart = getRevenueChartData()

  // 2. Attendance Trend (last 7 days grouped)
  const getAttendanceTrendData = () => {
    const dateCounts = {}
    attendance.forEach(a => {
      if (a.date) {
        if (!dateCounts[a.date]) {
          dateCounts[a.date] = { present: 0, total: 0 }
        }
        if (a.status === "Present") {
          dateCounts[a.date].present += 1
        }
        dateCounts[a.date].total += 1
      }
    })

    const sortedDates = Object.keys(dateCounts).sort().slice(-7)
    const percents = sortedDates.map(date => 
      Math.round((dateCounts[date].present / dateCounts[date].total) * 100)
    )
    return { dates: sortedDates, percents }
  }
  const attendanceTrend = getAttendanceTrendData()

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-900 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl flex items-center gap-3">
            <BarChart3 className="text-red-600" size={40} />
            Gym <span className="text-red-600">Analytics</span> & Reports
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            Professional SaaS-level auditing, data aggregation, interactive charts, and reports exporting.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchData}
            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
          >
            Sync Live Data
          </button>
          <button
            onClick={exportFullReportPDF}
            className="bg-red-600 hover:bg-red-700 text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-red-900/20"
          >
            <Printer size={16} /> Print Full Audit Report
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap gap-2 mb-8 bg-[#111111] p-1.5 rounded-2xl border border-gray-900">
        {[
          { id: "dashboard", label: "Overview Dashboard", icon: <BarChart3 size={18} /> },
          { id: "members", label: "Members Report", icon: <Users size={18} /> },
          { id: "trainers", label: "Trainers & Salary", icon: <UserCheck size={18} /> },
          { id: "payments", label: "Billing & Revenue", icon: <CreditCard size={18} /> },
          { id: "attendance", label: "Attendance Analysis", icon: <CalendarCheck size={18} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold tracking-wide transition-all cursor-pointer ${
              activeTab === tab.id 
                ? "bg-red-600 text-white shadow-md shadow-red-950/45" 
                : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        /* Loading State */
        <div className="min-h-[400px] flex flex-col justify-center items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-semibold animate-pulse text-sm">Aggregating live Firestore databases...</p>
        </div>
      ) : (
        /* Tabs Content */
        <div>
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-8 animate-fadeIn">
              
              {/* Dashboard KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Members", val: totalMembersCount, icon: <Users className="text-red-500" />, desc: "All registrations" },
                  { label: "Active Members", val: activeMembersCount, icon: <Award className="text-emerald-500" />, desc: "Paid & safe accounts" },
                  { label: "Expired Accounts", val: expiredMembersCount, icon: <ShieldAlert className="text-rose-500" />, desc: "Awaiting renewal" },
                  { label: "Gym Trainers", val: totalTrainersCount, icon: <UserCheck className="text-sky-500" />, desc: "Active fitness staff" }
                ].map((card, idx) => (
                  <div key={idx} className="bg-[#111111] p-5 rounded-3xl border border-gray-900 shadow-xl flex flex-col justify-between hover:border-gray-800 transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-gray-500 tracking-wider uppercase">{card.label}</span>
                      <div className="bg-black/40 p-2.5 rounded-xl border border-gray-800/50">{card.icon}</div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl font-black tracking-tight text-white">{card.val}</h3>
                      <p className="text-gray-500 text-xs mt-1.5">{card.desc}</p>
                    </div>
                  </div>
                ))}

                {[
                  { label: "Total Revenue", val: `₹${totalRevenue.toLocaleString()}`, icon: <CreditCard className="text-emerald-500" />, desc: "Paid invoices" },
                  { label: "Pending Fees", val: `₹${pendingFees.toLocaleString()}`, icon: <AlertTriangle className="text-amber-500" />, desc: "Awaiting billing" },
                  { label: "This Month Revenue", val: `₹${currentMonthPaidRevenue.toLocaleString()}`, icon: <TrendingUp className="text-rose-500" />, desc: "June earnings" },
                  { label: "Today Attendance", val: todayAttendanceCount, icon: <CalendarCheck className="text-sky-500" />, desc: "Active present today" }
                ].map((card, idx) => (
                  <div key={idx} className="bg-[#111111] p-5 rounded-3xl border border-gray-900 shadow-xl flex flex-col justify-between hover:border-gray-800 transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-gray-500 tracking-wider uppercase">{card.label}</span>
                      <div className="bg-black/40 p-2.5 rounded-xl border border-gray-800/50">{card.icon}</div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl font-black tracking-tight text-white">{card.val}</h3>
                      <p className="text-gray-500 text-xs mt-1.5">{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CHARTS GRAPHICS PANEL */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Chart 1: Revenue by Month (CSS Bar Graph) */}
                <div className="bg-[#111111] border border-gray-900 rounded-3xl p-6 flex flex-col justify-between">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-white tracking-wide">Monthly Revenue Flow</h3>
                    <p className="text-gray-500 text-xs mt-1">Paid billings aggregated by transaction date</p>
                  </div>
                  
                  <div className="flex items-end gap-2.5 h-44 border-b border-gray-800 pb-2 pl-2 w-full pt-4">
                    {revenueChart.months.map((m, idx) => {
                      const amount = revenueChart.monthTotals[idx]
                      const pct = Math.max((amount / revenueChart.maxTotal) * 100, 3) // min height of 3% if data exists
                      return (
                        <div key={m} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                          <div 
                            style={{ height: `${pct}%` }} 
                            className="w-full bg-gradient-to-t from-red-800 to-red-600 rounded-t-md transition-all group-hover:from-red-600 group-hover:to-red-500"
                          >
                            {/* Bar Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] font-bold px-2 py-1 rounded border border-gray-800 pointer-events-none whitespace-nowrap z-10">
                              ₹{amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="flex justify-between mt-2 pl-2 pr-0 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {revenueChart.months.map(m => <span key={m} className="flex-1 text-center">{m}</span>)}
                  </div>
                </div>

                {/* Chart 2: Expiry & Distribution (High-Tech Circular Gauges) */}
                <div className="bg-[#111111] border border-gray-900 rounded-3xl p-6 flex flex-col justify-between">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-white tracking-wide">Membership Expiry Distribution</h3>
                    <p className="text-gray-500 text-xs mt-1">System auto-audited active, expiring, and expired accounts</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4">
                    {[
                      { 
                        label: "Active", 
                        count: activeMembersCount, 
                        pct: totalMembersCount ? Math.round((activeMembersCount / totalMembersCount) * 100) : 0,
                        color: "stroke-emerald-500", 
                        bg: "text-emerald-950/40", 
                        textColor: "text-emerald-400" 
                      },
                      { 
                        label: "Expiring Soon", 
                        count: expiringSoonMembersCount, 
                        pct: totalMembersCount ? Math.round((expiringSoonMembersCount / totalMembersCount) * 100) : 0,
                        color: "stroke-amber-500", 
                        bg: "text-amber-950/40", 
                        textColor: "text-amber-400" 
                      },
                      { 
                        label: "Expired", 
                        count: expiredMembersCount, 
                        pct: totalMembersCount ? Math.round((expiredMembersCount / totalMembersCount) * 100) : 0,
                        color: "stroke-rose-500", 
                        bg: "text-rose-950/40", 
                        textColor: "text-rose-400" 
                      }
                    ].map((gauge, idx) => {
                      const radius = 28
                      const circ = 2 * Math.PI * radius
                      const strokeDashoffset = circ - (gauge.pct / 100) * circ
                      
                      return (
                        <div key={idx} className="flex flex-col items-center gap-2.5">
                          <div className="relative w-20 h-20">
                            {/* SVG Gauge */}
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                              <circle cx="32" cy="32" r={radius} className="stroke-gray-800" strokeWidth="6" fill="transparent" />
                              <circle 
                                cx="32" 
                                cy="32" 
                                r={radius} 
                                className={`${gauge.color} transition-all duration-1000`} 
                                strokeWidth="6" 
                                fill="transparent"
                                strokeDasharray={circ}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
                              {gauge.pct}%
                            </div>
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-bold text-white block">{gauge.label}</span>
                            <span className={`text-[11px] font-bold ${gauge.textColor} block mt-0.5`}>{gauge.count} Members</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Chart 3: Attendance Trend (Last 7 Logs) */}
                <div className="bg-[#111111] border border-gray-900 rounded-3xl p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-white tracking-wide">Daily Presence Trend</h3>
                    <p className="text-gray-500 text-xs mt-1">Attendance percentage calculated from daily logs</p>
                  </div>
                  
                  {attendanceTrend.dates.length === 0 ? (
                    <div className="h-40 flex flex-col justify-center items-center text-gray-600 text-xs italic">
                      No attendance data logged to plot trend.
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-end gap-4 h-40 border-b border-gray-800 pb-2 pl-2 w-full">
                        {attendanceTrend.percents.map((pct, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative group">
                            <div 
                              style={{ height: `${pct}%` }} 
                              className="w-full bg-red-950/60 border border-red-600/50 rounded-t-lg transition-all group-hover:bg-red-900/70"
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded border border-gray-800 pointer-events-none z-10">
                                {pct}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 pl-2 text-[9px] text-gray-500 font-bold">
                        {attendanceTrend.dates.map(d => (
                          <span key={d} className="flex-1 text-center overflow-hidden text-ellipsis whitespace-nowrap">{d.slice(5)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Widget 4: Trainer Payroll Overview */}
                <div className="bg-[#111111] border border-gray-900 rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">Gym Trainer Salaries Summary</h3>
                    <p className="text-gray-500 text-xs mt-1">SaaS expense logging for fitness staff payroll</p>
                  </div>

                  <div className="my-6 border-t border-b border-gray-900 py-4 flex flex-col gap-3.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Salary Expense</span>
                      <strong className="text-white">₹{totalSalaryExpense.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Paid Salaries</span>
                      <strong className="text-emerald-400">₹{paidSalaries.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Pending Salaries</span>
                      <strong className="text-amber-400">₹{pendingSalaries.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-950 h-2.5 rounded-full overflow-hidden border border-gray-800">
                      <div 
                        style={{ width: `${totalSalaryExpense ? (paidSalaries / totalSalaryExpense) * 100 : 0}%` }} 
                        className="bg-emerald-500 h-full rounded-full"
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      {totalSalaryExpense ? Math.round((paidSalaries / totalSalaryExpense) * 100) : 0}% Paid
                    </span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MEMBERS REPORT */}
          {activeTab === "members" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              
              {/* Table Toolbar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111111] p-5 rounded-3xl border border-gray-900 shadow-lg">
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="text"
                      placeholder="Search member name/phone..."
                      value={membersSearch}
                      onChange={(e) => setMembersSearch(e.target.value)}
                      className="bg-black border border-gray-850 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-red-600 text-xs w-full md:w-64 transition-all"
                    />
                  </div>

                  {/* Filter Select */}
                  <select
                    value={membersFilter}
                    onChange={(e) => setMembersFilter(e.target.value)}
                    className="bg-black border border-gray-850 rounded-xl py-2.5 px-4 outline-none focus:border-red-600 text-xs font-bold text-gray-400 transition-all"
                  >
                    <option value="all">All Members Statuses</option>
                    <option value="active">Active Members Only</option>
                    <option value="expired">Expired Members Only</option>
                    <option value="expiring_soon">Expiring Soon Only</option>
                  </select>

                </div>

                <div className="flex gap-2.5 w-full md:w-auto">
                  <button
                    onClick={() => {
                      const headers = ["Name", "Phone", "Plan", "Expiry Date", "Status", "Join Date"]
                      const rows = filteredMembers.map(m => [
                        m.name,
                        m.phone || "N/A",
                        m.plan,
                        m.expiry,
                        getExpiryStatus(m.expiry).text,
                        m.joinDate || "2026-05-01"
                      ])
                      exportCSV(headers, rows, "members_report")
                    }}
                    className="flex-1 md:flex-initial bg-gray-900 hover:bg-gray-850 border border-gray-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download size={14} /> Export Excel
                  </button>
                  <button
                    onClick={() => {
                      const headers = ["Name", "Phone", "Plan", "Expiry Date", "Status", "Join Date"]
                      const rows = filteredMembers.map(m => [
                        m.name,
                        m.phone || "N/A",
                        m.plan,
                        m.expiry,
                        getExpiryStatus(m.expiry).text,
                        m.joinDate || "2026-05-01"
                      ])
                      exportPDF("Gym Members directory Audit", headers, rows)
                    }}
                    className="flex-1 md:flex-initial bg-red-650 hover:bg-red-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Printer size={14} /> Export PDF
                  </button>
                </div>
              </div>

              {/* Members Table */}
              <div className="bg-[#111111] rounded-3xl border border-gray-900 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#1a1a1a]">
                      <tr>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Phone</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Plan</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Expiry</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Join Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-12 text-center text-gray-500 italic text-sm">
                            No members found matching query parameters.
                          </td>
                        </tr>
                      ) : (
                        filteredMembers.map((member) => {
                          const statusInfo = getExpiryStatus(member.expiry)
                          return (
                            <tr key={member.id} className="border-t border-gray-900/60 hover:bg-[#151515] transition-colors">
                              <td className="p-5 font-semibold text-white">{member.name}</td>
                              <td className="p-5 text-gray-400">{member.phone || "N/A"}</td>
                              <td className="p-5 text-gray-400">{member.plan}</td>
                              <td className="p-5 text-gray-400">{member.expiry}</td>
                              <td className="p-5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusInfo.badgeClass}`}>
                                  {statusInfo.text}
                                </span>
                              </td>
                              <td className="p-5 text-gray-500 text-xs">{member.joinDate || "2026-05-01"}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: TRAINERS & SALARY REPORT */}
          {activeTab === "trainers" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              
              {/* Stats Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Total Salaries Expense", val: `₹${totalSalaryExpense.toLocaleString()}`, color: "text-white" },
                  { label: "Paid Salaries", val: `₹${paidSalaries.toLocaleString()}`, color: "text-emerald-400" },
                  { label: "Pending Salaries", val: `₹${pendingSalaries.toLocaleString()}`, color: "text-amber-400" }
                ].map((card, idx) => (
                  <div key={idx} className="bg-[#111111] p-5 rounded-3xl border border-gray-900 flex justify-between items-center shadow-lg">
                    <div>
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">{card.label}</span>
                      <strong className={`text-2xl font-black block mt-2 ${card.color}`}>{card.val}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Toolbar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111111] p-5 rounded-3xl border border-gray-900 shadow-lg">
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    placeholder="Search trainer name/phone..."
                    value={trainersSearch}
                    onChange={(e) => setTrainersSearch(e.target.value)}
                    className="bg-black border border-gray-850 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-red-600 text-xs w-full md:w-64 transition-all"
                  />
                </div>

                <div className="flex gap-2.5 w-full md:w-auto">
                  <button
                    onClick={() => {
                      const headers = ["Trainer Name", "Phone", "Experience", "Specializations", "Assigned Members", "Salary", "Salary Status"]
                      const rows = filteredTrainers.map(t => [
                        t.name,
                        t.phone,
                        `${t.experience} Years`,
                        t.specializations?.join(" | ") || "General",
                        t.assignedMembers?.length || 0,
                        t.salary,
                        t.paymentStatus || "Pending"
                      ])
                      exportCSV(headers, rows, "trainers_report")
                    }}
                    className="flex-1 md:flex-initial bg-gray-900 hover:bg-gray-850 border border-gray-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download size={14} /> Export Excel
                  </button>
                  <button
                    onClick={() => {
                      const headers = ["Trainer Name", "Phone", "Experience", "Salary", "Salary Status", "Assigned Count"]
                      const rows = filteredTrainers.map(t => [
                        t.name,
                        t.phone,
                        `${t.experience} Years`,
                        `₹${t.salary}`,
                        t.paymentStatus || "Pending",
                        t.assignedMembers?.length || 0
                      ])
                      exportPDF("Gym Trainers Staff Audit", headers, rows)
                    }}
                    className="flex-1 md:flex-initial bg-red-650 hover:bg-red-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Printer size={14} /> Export PDF
                  </button>
                </div>
              </div>

              {/* Trainers Table */}
              <div className="bg-[#111111] rounded-3xl border border-gray-900 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#1a1a1a]">
                      <tr>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Trainer Name</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Phone</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Experience</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Specializations</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Members</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Salary</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Salary Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrainers.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-12 text-center text-gray-500 italic text-sm">
                            No trainers found matching query parameters.
                          </td>
                        </tr>
                      ) : (
                        filteredTrainers.map((trainer) => (
                          <tr key={trainer.id} className="border-t border-gray-900/60 hover:bg-[#151515] transition-colors">
                            <td className="p-5 font-semibold text-white">{trainer.name}</td>
                            <td className="p-5 text-gray-400">{trainer.phone}</td>
                            <td className="p-5 text-gray-400">{trainer.experience} Years</td>
                            <td className="p-5 text-xs text-red-500 max-w-[200px] truncate">
                              {trainer.specializations?.join(", ") || "General"}
                            </td>
                            <td className="p-5 text-gray-500 font-semibold">{trainer.assignedMembers?.length || 0} Members</td>
                            <td className="p-5 text-white font-semibold">₹{Number(trainer.salary).toLocaleString()}</td>
                            <td className="p-5">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide border ${
                                trainer.paymentStatus === "Paid"
                                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-900"
                                  : "bg-amber-950/80 text-amber-400 border-amber-900"
                              }`}>
                                {trainer.paymentStatus || "Pending"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: BILLING & REVENUE REPORT */}
          {activeTab === "payments" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              
              {/* Financial Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Total Revenue (Invoiced)", val: `₹${(totalRevenue + pendingFees).toLocaleString()}`, color: "text-white" },
                  { label: "Paid Revenue", val: `₹${totalRevenue.toLocaleString()}`, color: "text-emerald-400" },
                  { label: "Pending Revenue", val: `₹${pendingFees.toLocaleString()}`, color: "text-amber-400" }
                ].map((card, idx) => (
                  <div key={idx} className="bg-[#111111] p-5 rounded-3xl border border-gray-900 flex justify-between items-center shadow-lg">
                    <div>
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">{card.label}</span>
                      <strong className={`text-2xl font-black block mt-2 ${card.color}`}>{card.val}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Toolbar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111111] p-5 rounded-3xl border border-gray-900 shadow-lg">
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="text"
                      placeholder="Search member name..."
                      value={paymentsSearch}
                      onChange={(e) => setPaymentsSearch(e.target.value)}
                      className="bg-black border border-gray-850 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-red-600 text-xs w-full md:w-64 transition-all"
                    />
                  </div>

                  {/* Filter Select */}
                  <select
                    value={paymentsFilter}
                    onChange={(e) => setPaymentsFilter(e.target.value)}
                    className="bg-black border border-gray-850 rounded-xl py-2.5 px-4 outline-none focus:border-red-600 text-xs font-bold text-gray-400 transition-all"
                  >
                    <option value="all">All Invoices Status</option>
                    <option value="paid">Paid Invoices Only</option>
                    <option value="pending">Pending Invoices Only</option>
                  </select>

                </div>

                <div className="flex gap-2.5 w-full md:w-auto">
                  <button
                    onClick={() => {
                      const headers = ["Member Name", "Amount", "Payment Date", "Status"]
                      const rows = filteredPayments.map(p => [
                        p.memberName,
                        p.amount,
                        p.paymentDate,
                        p.status
                      ])
                      exportCSV(headers, rows, "payments_revenue_report")
                    }}
                    className="flex-1 md:flex-initial bg-gray-900 hover:bg-gray-850 border border-gray-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download size={14} /> Export Excel
                  </button>
                  <button
                    onClick={() => {
                      const headers = ["Member Name", "Amount", "Payment Date", "Status"]
                      const rows = filteredPayments.map(p => [
                        p.memberName,
                        `₹${p.amount}`,
                        p.paymentDate,
                        p.status
                      ])
                      exportPDF("Gym Revenue Transactions Audit", headers, rows)
                    }}
                    className="flex-1 md:flex-initial bg-red-650 hover:bg-red-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Printer size={14} /> Export PDF
                  </button>
                </div>
              </div>

              {/* Payments Table */}
              <div className="bg-[#111111] rounded-3xl border border-gray-900 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#1a1a1a]">
                      <tr>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Member Name</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Date</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-12 text-center text-gray-500 italic text-sm">
                            No billing invoices found matching query parameters.
                          </td>
                        </tr>
                      ) : (
                        filteredPayments.map((payment) => (
                          <tr key={payment.id} className="border-t border-gray-900/60 hover:bg-[#151515] transition-colors">
                            <td className="p-5 font-semibold text-white">{payment.memberName}</td>
                            <td className="p-5 text-white font-bold">₹{Number(payment.amount).toLocaleString()}</td>
                            <td className="p-5 text-gray-400">{payment.paymentDate}</td>
                            <td className="p-5">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide border ${
                                payment.status === "Paid"
                                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-900"
                                  : "bg-amber-950/80 text-amber-400 border-amber-900"
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: ATTENDANCE ANALYSIS */}
          {activeTab === "attendance" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              
              {/* Attendance metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Present Logs count", val: attendancePresentCount, color: "text-emerald-400" },
                  { label: "Absent Logs count", val: attendanceAbsentCount, color: "text-rose-400" },
                  { label: "Attendance rate (%)", val: `${attendancePercentage}%`, color: "text-white" }
                ].map((card, idx) => (
                  <div key={idx} className="bg-[#111111] p-5 rounded-3xl border border-gray-900 flex justify-between items-center shadow-lg">
                    <div>
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">{card.label}</span>
                      <strong className={`text-2xl font-black block mt-2 ${card.color}`}>{card.val}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Toolbar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111111] p-5 rounded-3xl border border-gray-900 shadow-lg">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="text"
                      placeholder="Search member name..."
                      value={attendanceSearch}
                      onChange={(e) => setAttendanceSearch(e.target.value)}
                      className="bg-black border border-gray-850 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-red-600 text-xs w-60 transition-all"
                    />
                  </div>

                  {/* Start Date */}
                  <div className="flex items-center gap-2 bg-black border border-gray-850 rounded-xl py-1 px-3">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">From:</span>
                    <input
                      type="date"
                      value={attendanceStartDate}
                      onChange={(e) => setAttendanceStartDate(e.target.value)}
                      className="bg-transparent outline-none text-xs text-gray-300 font-semibold cursor-pointer border-none p-1.5 focus:ring-0"
                    />
                  </div>

                  {/* End Date */}
                  <div className="flex items-center gap-2 bg-black border border-gray-850 rounded-xl py-1 px-3">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">To:</span>
                    <input
                      type="date"
                      value={attendanceEndDate}
                      onChange={(e) => setAttendanceEndDate(e.target.value)}
                      className="bg-transparent outline-none text-xs text-gray-300 font-semibold cursor-pointer border-none p-1.5 focus:ring-0"
                    />
                  </div>

                </div>

                <div className="flex gap-2.5 w-full md:w-auto">
                  <button
                    onClick={() => {
                      const headers = ["Member Name", "Date", "Status"]
                      const rows = filteredAttendance.map(a => [
                        a.memberName,
                        a.date,
                        a.status
                      ])
                      exportCSV(headers, rows, "attendance_report")
                    }}
                    className="flex-1 md:flex-initial bg-gray-900 hover:bg-gray-850 border border-gray-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download size={14} /> Export Excel
                  </button>
                  <button
                    onClick={() => {
                      const headers = ["Member Name", "Date", "Status"]
                      const rows = filteredAttendance.map(a => [
                        a.memberName,
                        a.date,
                        a.status
                      ])
                      exportPDF("Member Daily Attendance Audit", headers, rows)
                    }}
                    className="flex-1 md:flex-initial bg-red-650 hover:bg-red-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Printer size={14} /> Export PDF
                  </button>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="bg-[#111111] rounded-3xl border border-gray-900 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#1a1a1a]">
                      <tr>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Member Name</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="p-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendance.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-12 text-center text-gray-500 italic text-sm">
                            No attendance logs found matching query parameters.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendance.map((log) => (
                          <tr key={log.id} className="border-t border-gray-900/60 hover:bg-[#151515] transition-colors">
                            <td className="p-5 font-semibold text-white">{log.memberName}</td>
                            <td className="p-5 text-gray-400">{log.date}</td>
                            <td className="p-5">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide border ${
                                log.status === "Present"
                                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-900"
                                  : "bg-red-950/80 text-red-400 border-red-900"
                              }`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  )
}

export default Reports
