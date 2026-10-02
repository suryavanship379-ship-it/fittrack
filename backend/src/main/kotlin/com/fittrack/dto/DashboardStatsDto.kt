package com.fittrack.dto

data class DashboardStatsDto(
    val totalMembers: Long,
    val activeMembers: Long,
    val pendingFees: Double,
    val revenue: Double,
    val todayAttendanceCount: Long
)
