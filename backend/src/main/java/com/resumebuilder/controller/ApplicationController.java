package com.resumebuilder.controller;

import com.resumebuilder.entity.InterviewStep;
import com.resumebuilder.entity.JobApplication;
import com.resumebuilder.entity.User;
import com.resumebuilder.repository.JobApplicationRepository;
import com.resumebuilder.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    public ApplicationController(JobApplicationRepository applicationRepository,
                                 UserRepository userRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
    }

    private UUID getAuthenticatedUserId() {
        String userIdStr = (String) SecurityContextHolder.getContext().getAuthentication().getCredentials();
        return UUID.fromString(userIdStr);
    }

    // GET /api/applications - returns all user applications
    @GetMapping
    public ResponseEntity<List<JobApplication>> getApplications() {
        UUID userId = getAuthenticatedUserId();
        List<JobApplication> apps = applicationRepository.findByUserId(userId);
        
        // Sort descending by creation date
        apps.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        
        return ResponseEntity.ok(apps);
    }

    // POST /api/applications - creates or updates a job application with nested steps
    @PostMapping
    public ResponseEntity<?> saveApplication(@RequestBody Map<String, Object> payload) {
        UUID userId = getAuthenticatedUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));

        String idStr = (String) payload.get("id");
        JobApplication application = null;

        if (idStr != null && !idStr.trim().isEmpty()) {
            try {
                UUID appId = UUID.fromString(idStr);
                Optional<JobApplication> existing = applicationRepository.findByUserIdAndId(userId, appId);
                if (existing.isPresent()) {
                    application = existing.get();
                }
            } catch (IllegalArgumentException e) {
                // Not a UUID string, probably a temporary frontend-only numerical timestamp. We will treat it as a new save.
            }
        }

        if (application == null) {
            application = new JobApplication();
            application.setUser(user);
        }

        application.setCompanyName((String) payload.get("companyName"));
        application.setRoleTitle((String) payload.get("roleTitle"));
        application.setJobDescription((String) payload.get("jobDescription"));
        application.setAppliedDate((String) payload.get("appliedDate"));
        application.setStatus((String) payload.get("status"));
        application.setSkillsDossierFileName((String) payload.get("skillsDossierFileName"));
        application.setSkillsDossierText((String) payload.get("skillsDossierText"));
        application.setResumeDataUsed((Map<String, Object>) payload.get("resumeDataUsed"));
        application.setNotes((String) payload.get("notes"));
        application.setUpdatedAt(OffsetDateTime.now());

        // Process nested interview steps
        List<Map<String, Object>> stepsList = (List<Map<String, Object>>) payload.get("interviewSteps");
        List<InterviewStep> newSteps = new ArrayList<>();

        if (stepsList != null) {
            for (Map<String, Object> stepMap : stepsList) {
                InterviewStep step = new InterviewStep();
                step.setApplication(application);
                step.setTitle((String) stepMap.get("title"));
                step.setStatus((String) stepMap.get("status"));
                step.setNotes((String) stepMap.get("notes"));
                step.setAiPrep((String) stepMap.get("aiPrep"));
                step.setDate((String) stepMap.get("date"));
                newSteps.add(step);
            }
        }

        // JPA Cascade ALL and orphanRemoval handles clean overwrite when setting the collection reference!
        application.getInterviewSteps().clear();
        application.getInterviewSteps().addAll(newSteps);

        JobApplication saved = applicationRepository.save(application);
        return ResponseEntity.ok(saved);
    }

    // DELETE /api/applications/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteApplication(@PathVariable UUID id) {
        UUID userId = getAuthenticatedUserId();
        Optional<JobApplication> appOpt = applicationRepository.findByUserIdAndId(userId, id);

        if (appOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Candidature introuvable ou non autorisée."));
        }

        applicationRepository.delete(appOpt.get());
        return ResponseEntity.ok(Map.of("success", true, "message", "Candidature supprimée."));
    }

    // POST /api/applications/sync - Bulk import local storage applications into backend DB
    @PostMapping("/sync")
    public ResponseEntity<?> syncLocalApplications(@RequestBody List<Map<String, Object>> localApps) {
        UUID userId = getAuthenticatedUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));

        for (Map<String, Object> localApp : localApps) {
            JobApplication app = new JobApplication();
            app.setUser(user);
            app.setCompanyName((String) localApp.get("companyName"));
            app.setRoleTitle((String) localApp.get("roleTitle"));
            app.setJobDescription((String) localApp.get("jobDescription"));
            app.setAppliedDate((String) localApp.get("appliedDate"));
            app.setStatus((String) localApp.get("status"));
            app.setSkillsDossierFileName((String) localApp.get("skillsDossierFileName"));
            app.setSkillsDossierText((String) localApp.get("skillsDossierText"));
            app.setResumeDataUsed((Map<String, Object>) localApp.get("resumeDataUsed"));
            app.setNotes((String) localApp.get("notes"));

            List<Map<String, Object>> stepsList = (List<Map<String, Object>>) localApp.get("interviewSteps");
            if (stepsList != null) {
                for (Map<String, Object> stepMap : stepsList) {
                    InterviewStep step = new InterviewStep();
                    step.setApplication(app);
                    step.setTitle((String) stepMap.get("title"));
                    step.setStatus((String) stepMap.get("status"));
                    step.setNotes((String) stepMap.get("notes"));
                    step.setAiPrep((String) stepMap.get("aiPrep"));
                    step.setDate((String) stepMap.get("date"));
                    app.getInterviewSteps().add(step);
                }
            }
            applicationRepository.save(app);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Suivi des candidatures synchronisé avec le cloud."));
    }
}
