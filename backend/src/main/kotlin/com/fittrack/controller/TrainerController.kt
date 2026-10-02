package com.fittrack.controller

import com.fittrack.model.Trainer
import com.fittrack.repository.TrainerRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/trainers")
@CrossOrigin(origins = ["*"])
class TrainerController(
    private val trainerRepository: TrainerRepository
) {

    @GetMapping
    fun getAllTrainers(): List<Trainer> {
        val list = trainerRepository.findAll()
        if (list.isEmpty()) {
            return listOf(
                Trainer(id = 101, name = "Vikram Singh", phone = "9988776655", email = "vikram@fittrack.com", specialization = "Muscle Gain", experience = "5 Years", availability = "Full-Time", salary = 45000.0),
                Trainer(id = 102, name = "Priya Nair", phone = "9123456789", email = "priya@fittrack.com", specialization = "Weight Loss", experience = "3 Years", availability = "Full-Time", salary = 38000.0)
            )
        }
        return list
    }

    @PostMapping
    fun createTrainer(@RequestBody trainer: Trainer): ResponseEntity<Trainer> {
        val savedTrainer = trainerRepository.save(trainer)
        return ResponseEntity.ok(savedTrainer)
    }

    @DeleteMapping("/{id}")
    fun deleteTrainer(@PathVariable id: Long): ResponseEntity<Map<String, Any>> {
        return if (trainerRepository.existsById(id)) {
            trainerRepository.deleteById(id)
            ResponseEntity.ok(mapOf("success" to true, "message" to "Trainer deleted successfully"))
        } else {
            ResponseEntity.notFound().build()
        }
    }
}
