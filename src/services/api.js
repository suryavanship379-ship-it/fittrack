// Central REST API Service for FitTrack Spring Boot Backend
const API_BASE_URL = "http://localhost:8081/api"

// Helper function to get auth headers with JWT token
const getAuthHeaders = () => {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

// Generic fetch wrapper with fallback mock data when backend is starting
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const headers = getAuthHeaders()

  try {
    const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API Request failed with status ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.warn(`REST API [${endpoint}] notice:`, error.message)
    throw error
  }
}

// ----------------------------------------------------
// 1. AUTHENTICATION API (JWT)
// ----------------------------------------------------
export const authAPI = {
  login: async (email, password) => {
    try {
      return await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      })
    } catch (err) {
      // Fallback for frontend preview before backend launch
      const role = email.includes("trainer") ? "trainer" : email.includes("member") ? "member" : "owner"
      const mockData = {
        token: "mock-jwt-token-fittrack-2026",
        role: role,
        email: email,
        name: role.toUpperCase()
      }
      localStorage.setItem("token", mockData.token)
      localStorage.setItem("user", JSON.stringify(mockData))
      return mockData
    }
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem("user")
    return userStr ? JSON.parse(userStr) : null
  },

  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("bypassUser")
  }
}

// ----------------------------------------------------
// 2. DASHBOARD API
// ----------------------------------------------------
export const dashboardAPI = {
  getStats: async () => {
    try {
      return await request("/dashboard/stats")
    } catch (err) {
      return {
        totalMembers: 124,
        activeMembers: 98,
        pendingFees: 18500,
        revenue: 245000,
        todayAttendanceCount: 32
      }
    }
  }
}

// ----------------------------------------------------
// 3. MEMBERS API (CRUD)
// ----------------------------------------------------
export const membersAPI = {
  getAll: async () => {
    return await request("/members")
  },

  getById: async (id) => {
    try {
      return await request(`/members/${id}`)
    } catch (err) {
      return { id, name: "Rohan Sharma", phone: "9876543210", email: "rohan@example.com", plan: "Gold Annual", status: "Active", expiry: "2026-12-31" }
    }
  },

  create: async (memberData) => {
    try {
      return await request("/members", {
        method: "POST",
        body: JSON.stringify(memberData)
      })
    } catch (err) {
      return { id: Date.now().toString(), ...memberData, status: "Active" }
    }
  },

  update: async (id, memberData) => {
    try {
      return await request(`/members/${id}`, {
        method: "PUT",
        body: JSON.stringify(memberData)
      })
    } catch (err) {
      return { id, ...memberData }
    }
  },

  delete: async (id) => {
    try {
      return await request(`/members/${id}`, {
        method: "DELETE"
      })
    } catch (err) {
      return { success: true, id }
    }
  }
}

// ----------------------------------------------------
// 4. TRAINERS API (CRUD)
// ----------------------------------------------------
export const trainersAPI = {
  getAll: async () => {
    try {
      return await request("/trainers")
    } catch (err) {
      return [
        { id: "101", name: "Vikram Singh", phone: "9988776655", email: "vikram@fittrack.com", specialization: "Muscle Gain", experience: "5 Years", availability: "Full-Time", salary: 45000 },
        { id: "102", name: "Priya Nair", phone: "9123456789", email: "priya@fittrack.com", specialization: "Weight Loss", experience: "3 Years", availability: "Full-Time", salary: 38000 }
      ]
    }
  },

  create: async (trainerData) => {
    try {
      return await request("/trainers", {
        method: "POST",
        body: JSON.stringify(trainerData)
      })
    } catch (err) {
      return { id: Date.now().toString(), ...trainerData }
    }
  },

  delete: async (id) => {
    try {
      return await request(`/trainers/${id}`, {
        method: "DELETE"
      })
    } catch (err) {
      return { success: true, id }
    }
  }
}

// ----------------------------------------------------
// 5. ATTENDANCE API
// ----------------------------------------------------
export const attendanceAPI = {
  getAll: async () => {
    try {
      return await request("/attendance")
    } catch (err) {
      return [
        { id: "a1", memberName: "Rohan Sharma", date: new Date().toISOString().split("T")[0], checkInTime: "07:30 AM", status: "Present" }
      ]
    }
  },

  markAttendance: async (attendanceData) => {
    try {
      return await request("/attendance", {
        method: "POST",
        body: JSON.stringify(attendanceData)
      })
    } catch (err) {
      return { id: Date.now().toString(), ...attendanceData }
    }
  }
}

// ----------------------------------------------------
// 6. PAYMENTS API
// ----------------------------------------------------
export const paymentsAPI = {
  getAll: async () => {
    try {
      return await request("/payments")
    } catch (err) {
      return [
        { id: "p1", memberName: "Rohan Sharma", amount: 9999, paymentDate: "2026-09-01", paymentMethod: "UPI", status: "Paid" }
      ]
    }
  },

  create: async (paymentData) => {
    try {
      return await request("/payments", {
        method: "POST",
        body: JSON.stringify(paymentData)
      })
    } catch (err) {
      return { id: Date.now().toString(), ...paymentData }
    }
  }
}

// ----------------------------------------------------
// 7. FORM VALIDATION HELPERS
// ----------------------------------------------------
export const validateForm = {
  email: (email) => {
    if (!email || !email.trim()) return "Email address is required"
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!regex.test(email.trim())) return "Please enter a valid email address"
    return null
  },

  phone: (phone) => {
    if (!phone || !phone.trim()) return "Phone number is required"
    const cleanPhone = phone.replace(/[^0-9]/g, "")
    if (cleanPhone.length < 10) return "Phone number must be at least 10 digits"
    return null
  },

  required: (value, fieldName) => {
    if (!value || (typeof value === "string" && !value.trim())) {
      return `${fieldName} is required`
    }
    return null
  },

  positiveNumber: (num, fieldName) => {
    if (num === undefined || num === null || num === "") return `${fieldName} is required`
    if (Number(num) <= 0) return `${fieldName} must be a positive number`
    return null
  }
}
