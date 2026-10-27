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

        populateApplicationFields(application, payload);
        application.setUpdatedAt(OffsetDateTime.now());

        JobApplication saved = applicationRepository.save(application);
        return ResponseEntity.ok(saved);
    }

    private Double toDouble(Object val) {
        if (val instanceof Number n) {
            return n.doubleValue();
        }
        if (val instanceof String s && !s.isBlank()) {
            try {
                return Double.parseDouble(s);
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private void populateApplicationFields(JobApplication application, Map<String, Object> payload) {
        String companyName = (String) payload.get("companyName");
        String roleTitle = (String) payload.get("roleTitle");
        String appliedDate = (String) payload.get("appliedDate");
        String status = (String) payload.get("status");

        application.setCompanyName(companyName != null ? companyName : "");
        application.setRoleTitle(roleTitle != null ? roleTitle : "");
        application.setJobDescription((String) payload.get("jobDescription"));
        application.setAppliedDate(appliedDate != null ? appliedDate : "");
        application.setStatus(status != null ? status : "draft");
        application.setSkillsDossierFileName((String) payload.get("skillsDossierFileName"));
        application.setSkillsDossierText((String) payload.get("skillsDossierText"));
        application.setResumeDataUsed((Map<String, Object>) payload.get("resumeDataUsed"));
        application.setResumeVersionId((String) payload.get("resumeVersionId"));
        application.setNotes((String) payload.get("notes"));
        application.setCoverLetterText((String) payload.get("coverLetterText"));
        application.setCompanyType((String) payload.get("companyType"));
        application.setLocation((String) payload.get("location"));
        application.setContractType((String) payload.get("contractType"));
        application.setSalaryExpectation(toDouble(payload.get("salaryExpectation")));
        application.setSalaryOffer(toDouble(payload.get("salaryOffer")));
        application.setTjmExpectation(toDouble(payload.get("tjmExpectation")));
        application.setTjmOffer(toDouble(payload.get("tjmOffer")));
        application.setSalaryEstimateAiResult((String) payload.get("salaryEstimateAiResult"));

        List<Map<String, Object>> stepsList = (List<Map<String, Object>>) payload.get("interviewSteps");
        if (stepsList != null) {
            List<InterviewStep> updatedSteps = new ArrayList<>();
            OffsetDateTime stepTime = OffsetDateTime.now();
            int idx = 0;

            for (Map<String, Object> stepMap : stepsList) {
                Object stepIdObj = stepMap.get("id");
                UUID stepId = null;
                if (stepIdObj != null) {
                    try {
                        stepId = UUID.fromString(stepIdObj.toString());
                    } catch (IllegalArgumentException ignored) {}
                }

                // Look for existing step by UUID in application's current steps
                InterviewStep step = null;
                if (stepId != null && application.getInterviewSteps() != null) {
                    for (InterviewStep s : application.getInterviewSteps()) {
                        if (stepId.equals(s.getId())) {
                            step = s;
                            break;
                        }
                    }
                }

                String stepTitle = (String) stepMap.get("title");
                String stepStatus = (String) stepMap.get("status");

                if (step != null) {
                    // Update existing step in-place to preserve its persistent ID and relations
                    step.setTitle(stepTitle != null ? stepTitle : "Entretien");
                    step.setStatus(stepStatus != null ? stepStatus : "pending");
                    step.setNotes((String) stepMap.get("notes"));
                    step.setAiPrep((String) stepMap.get("aiPrep"));
                    step.setDate((String) stepMap.get("date"));
                    step.setUpdatedAt(OffsetDateTime.now());
                    updatedSteps.add(step);
                } else {
                    // Create new step entity
                    InterviewStep newStep = new InterviewStep();
                    newStep.setApplication(application);
                    newStep.setTitle(stepTitle != null ? stepTitle : "Entretien");
                    newStep.setStatus(stepStatus != null ? stepStatus : "pending");
                    newStep.setNotes((String) stepMap.get("notes"));
                    newStep.setAiPrep((String) stepMap.get("aiPrep"));
                    newStep.setDate((String) stepMap.get("date"));
                    newStep.setCreatedAt(stepTime.plusSeconds(idx++));
                    newStep.setUpdatedAt(OffsetDateTime.now());
                    updatedSteps.add(newStep);
                }
            }

            // Remove steps deleted by the user
            application.getInterviewSteps().removeIf(s -> !updatedSteps.contains(s));

            // Add newly created steps
            for (InterviewStep s : updatedSteps) {
                if (!application.getInterviewSteps().contains(s)) {
                    application.getInterviewSteps().add(s);
                }
            }
        }
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

        List<JobApplication> existingApps = applicationRepository.findByUserId(userId);
        OffsetDateTime baseTime = OffsetDateTime.now().minusSeconds(localApps.size());

        for (int i = localApps.size() - 1; i >= 0; i--) {
            Map<String, Object> localApp = localApps.get(i);
            String idStr = (String) localApp.get("id");
            String companyName = (String) localApp.get("companyName");
            String roleTitle = (String) localApp.get("roleTitle");
            String appliedDate = (String) localApp.get("appliedDate");

            JobApplication app = null;
            if (idStr != null && !idStr.isBlank()) {
                try {
                    UUID appId = UUID.fromString(idStr);
                    app = existingApps.stream().filter(a -> appId.equals(a.getId())).findFirst().orElse(null);
                } catch (IllegalArgumentException ignored) {}
            }
            if (app == null && companyName != null && roleTitle != null) {
                app = existingApps.stream()
                        .filter(a -> Objects.equals(a.getCompanyName(), companyName)
                                && Objects.equals(a.getRoleTitle(), roleTitle)
                                && Objects.equals(a.getAppliedDate(), appliedDate != null ? appliedDate : ""))
                        .findFirst()
                        .orElse(null);
            }
            if (app == null) {
                app = new JobApplication();
                app.setUser(user);
            }

            populateApplicationFields(app, localApp);
            app.setCreatedAt(baseTime.plusSeconds(localApps.size() - i));
            app.setUpdatedAt(OffsetDateTime.now());
            applicationRepository.save(app);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Suivi des candidatures synchronisé avec le cloud."));
    }
}
