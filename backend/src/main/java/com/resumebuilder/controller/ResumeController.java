package com.resumebuilder.controller;

import com.resumebuilder.entity.Resume;
import com.resumebuilder.entity.ResumeVersion;
import com.resumebuilder.entity.User;
import com.resumebuilder.repository.ResumeRepository;
import com.resumebuilder.repository.ResumeVersionRepository;
import com.resumebuilder.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeRepository resumeRepository;
    private final ResumeVersionRepository versionRepository;
    private final UserRepository userRepository;

    public ResumeController(ResumeRepository resumeRepository,
                            ResumeVersionRepository versionRepository,
                            UserRepository userRepository) {
        this.resumeRepository = resumeRepository;
        this.versionRepository = versionRepository;
        this.userRepository = userRepository;
    }

    private UUID getAuthenticatedUserId() {
        String userIdStr = (String) SecurityContextHolder.getContext().getAuthentication().getCredentials();
        return UUID.fromString(userIdStr);
    }

    // GET /api/resumes/versions - returns all resume versions formatted to match the frontend SavedVersion interface
    @GetMapping("/versions")
    public ResponseEntity<List<Map<String, Object>>> getVersions() {
        UUID userId = getAuthenticatedUserId();
        List<ResumeVersion> versions = versionRepository.findByResumeUser_Id(userId);
        
        // Sort descending by creation date (newest first)
        versions.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));

        List<Map<String, Object>> result = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        for (ResumeVersion v : versions) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", v.getId().toString());
            map.put("name", v.getVersionName());
            map.put("updatedAt", v.getCreatedAt().format(formatter));
            map.put("data", v.getResumeData());
            map.put("isLocked", Boolean.TRUE.equals(v.getIsLocked()));
            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    // POST /api/resumes/versions - saves a new resume version, auto-creating a main Resume record if none exists
    @PostMapping("/versions")
    public ResponseEntity<?> saveVersion(@RequestBody Map<String, Object> payload) {
        UUID userId = getAuthenticatedUserId();
        String versionName = (String) payload.get("versionName");
        Map<String, Object> resumeData = (Map<String, Object>) payload.get("resumeData");

        if (versionName == null || resumeData == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Les champs versionName et resumeData sont obligatoires."));
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));

        // Fetch or create a primary resume metadata record for this user
        List<Resume> userResumes = resumeRepository.findByUserId(userId);
        Resume resume;
        if (userResumes.isEmpty()) {
            resume = new Resume();
            resume.setUser(user);
            resume.setTitle("Mon CV Principal");
            resume.setLanguage("fr");
            resume.setStyleSettings(new HashMap<>());
            resume = resumeRepository.save(resume);
        } else {
            resume = userResumes.get(0);
        }

        // Check if a version with the same name already exists to overwrite it, otherwise create new
        List<ResumeVersion> existingList = versionRepository.findAllByUserIdAndVersionName(userId, versionName);
        ResumeVersion version;
        if (!existingList.isEmpty()) {
            version = existingList.get(0);
            if (existingList.size() > 1) {
                versionRepository.deleteAll(existingList.subList(1, existingList.size()));
            }
        } else {
            version = new ResumeVersion();
            version.setResume(resume);
            version.setVersionName(versionName);
        }
        
        version.setResumeData(resumeData);
        if (payload.get("isLocked") instanceof Boolean isLocked) {
            version.setIsLocked(isLocked);
        } else if (version.getIsLocked() == null) {
            version.setIsLocked(false);
        }
        // Force update timestamp for overwritten versions
        version.setCreatedAt(OffsetDateTime.now());
        
        ResumeVersion saved = versionRepository.save(version);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId().toString());
        response.put("name", saved.getVersionName());
        response.put("updatedAt", saved.getCreatedAt().format(formatter));
        response.put("data", saved.getResumeData());
        response.put("isLocked", Boolean.TRUE.equals(saved.getIsLocked()));

        return ResponseEntity.ok(response);
    }

    // DELETE /api/resumes/versions/{id}
    @DeleteMapping("/versions/{id}")
    public ResponseEntity<?> deleteVersion(@PathVariable UUID id) {
        UUID userId = getAuthenticatedUserId();
        Optional<ResumeVersion> versionOpt = versionRepository.findByResumeUser_IdAndId(userId, id);
        
        if (versionOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Version introuvable ou non autorisée."));
        }

        versionRepository.delete(versionOpt.get());
        return ResponseEntity.ok(Map.of("success", true, "message", "Version supprimée avec succès."));
    }

    // POST /api/resumes/sync - Bulk import local storage resumes history into backend DB
    @PostMapping("/sync")
    public ResponseEntity<?> syncLocalVersions(@RequestBody List<Map<String, Object>> localVersions) {
        UUID userId = getAuthenticatedUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));

        List<Resume> userResumes = resumeRepository.findByUserId(userId);
        Resume resume;
        if (userResumes.isEmpty()) {
            resume = new Resume();
            resume.setUser(user);
            resume.setTitle("Mon CV Principal");
            resume.setLanguage("fr");
            resume.setStyleSettings(new HashMap<>());
            resume = resumeRepository.save(resume);
        } else {
            resume = userResumes.get(0);
        }

        final Resume activeResume = resume;
        OffsetDateTime baseTime = OffsetDateTime.now().minusSeconds(localVersions.size());
        for (int i = localVersions.size() - 1; i >= 0; i--) {
            Map<String, Object> localVer = localVersions.get(i);
            String name = (String) localVer.get("name");
            Map<String, Object> data = (Map<String, Object>) localVer.get("data");
            if (name == null || data == null) continue;

            // Overwrite if same name exists, otherwise create new
            List<ResumeVersion> existingList = versionRepository.findAllByUserIdAndVersionName(userId, name);
            ResumeVersion version;
            if (!existingList.isEmpty()) {
                version = existingList.get(0);
                if (existingList.size() > 1) {
                    versionRepository.deleteAll(existingList.subList(1, existingList.size()));
                }
                // Protect against overwriting a real Cloud CV with the default "Jane Doe" placeholder template
                if (isDefaultPlaceholderResume(data) && !isDefaultPlaceholderResume(version.getResumeData())) {
                    continue;
                }
            } else {
                version = new ResumeVersion();
                version.setResume(activeResume);
                version.setVersionName(name);
            }
            version.setResumeData(data);
            if (localVer.get("isLocked") instanceof Boolean isLocked) {
                version.setIsLocked(isLocked);
            } else if (version.getIsLocked() == null) {
                version.setIsLocked(false);
            }
            version.setCreatedAt(baseTime.plusSeconds(localVersions.size() - i));
            versionRepository.save(version);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Historique de CV synchronisé avec le cloud."));
    }

    @SuppressWarnings("unchecked")
    private boolean isDefaultPlaceholderResume(Map<String, Object> resumeData) {
        if (resumeData == null) return true;
        Object personalInfoObj = resumeData.get("personalInfo");
        if (personalInfoObj instanceof Map<?, ?> personalInfo) {
            Object fullName = personalInfo.get("fullName");
            Object email = personalInfo.get("email");
            return "Jane Doe".equals(fullName) && "jane.doe@example.com".equals(email);
        }
        return false;
    }
}
