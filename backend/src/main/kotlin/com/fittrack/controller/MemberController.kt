package com.fittrack.controller

import com.fittrack.model.Member
import com.fittrack.repository.MemberRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/members")
@CrossOrigin(origins = ["*"])
class MemberController(
    private val memberRepository: MemberRepository
) {

    @GetMapping
    fun getAllMembers(): List<Member> {
        return memberRepository.findAll()
    }

    @GetMapping("/{id}")
    fun getMemberById(@PathVariable id: Long): ResponseEntity<Member> {
        val memberOpt = memberRepository.findById(id)
        return if (memberOpt.isPresent) ResponseEntity.ok(memberOpt.get())
        else ResponseEntity.notFound().build()
    }

    @PostMapping
    fun createMember(@RequestBody member: Member): ResponseEntity<Member> {
        val savedMember = memberRepository.save(member)
        return ResponseEntity.ok(savedMember)
    }

    @PutMapping("/{id}")
    fun updateMember(@PathVariable id: Long, @RequestBody memberDetails: Member): ResponseEntity<Member> {
        val memberOpt = memberRepository.findById(id)
        if (!memberOpt.isPresent) return ResponseEntity.notFound().build()

        val existingMember = memberOpt.get()
        val updatedMember = existingMember.copy(
            name = memberDetails.name.ifEmpty { existingMember.name },
            phone = memberDetails.phone.ifEmpty { existingMember.phone },
            email = memberDetails.email.ifEmpty { existingMember.email },
            plan = memberDetails.plan.ifEmpty { existingMember.plan },
            expiry = memberDetails.expiry.ifEmpty { existingMember.expiry },
            status = memberDetails.status.ifEmpty { existingMember.status }
        )
        return ResponseEntity.ok(memberRepository.save(updatedMember))
    }

    @DeleteMapping("/{id}")
    fun deleteMember(@PathVariable id: Long): ResponseEntity<Map<String, Any>> {
        return if (memberRepository.existsById(id)) {
            memberRepository.deleteById(id)
            ResponseEntity.ok(mapOf("success" to true, "message" to "Member deleted successfully"))
        } else {
            ResponseEntity.notFound().build()
        }
    }
}
