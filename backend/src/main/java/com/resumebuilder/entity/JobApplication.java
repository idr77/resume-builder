package com.resumebuilder.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "applications")
public class JobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "company_name", nullable = false, length = 150)
    private String companyName;

    @Column(name = "role_title", nullable = false, length = 150)
    private String roleTitle;

    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "applied_date", nullable = false, length = 50)
    private String appliedDate;

    @Column(nullable = false, length = 50)
    private String status = "draft";

    @Column(name = "skills_dossier_file_name", length = 255)
    private String skillsDossierFileName;

    @Column(name = "skills_dossier_text", columnDefinition = "TEXT")
    private String skillsDossierText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "resume_data_used")
    private Map<String, Object> resumeDataUsed;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "cover_letter_text", columnDefinition = "TEXT")
    private String coverLetterText;

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("createdAt ASC")
    private List<InterviewStep> interviewSteps = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public JobApplication() {}

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getRoleTitle() {
        return roleTitle;
    }

    public void setRoleTitle(String roleTitle) {
        this.roleTitle = roleTitle;
    }

    public String getJobDescription() {
        return jobDescription;
    }

    public void setJobDescription(String jobDescription) {
        this.jobDescription = jobDescription;
    }

    public String getAppliedDate() {
        return appliedDate;
    }

    public void setAppliedDate(String appliedDate) {
        this.appliedDate = appliedDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSkillsDossierFileName() {
        return skillsDossierFileName;
    }

    public void setSkillsDossierFileName(String skillsDossierFileName) {
        this.skillsDossierFileName = skillsDossierFileName;
    }

    public String getSkillsDossierText() {
        return skillsDossierText;
    }

    public void setSkillsDossierText(String skillsDossierText) {
        this.skillsDossierText = skillsDossierText;
    }

    public Map<String, Object> getResumeDataUsed() {
        return resumeDataUsed;
    }

    public void setResumeDataUsed(Map<String, Object> resumeDataUsed) {
        this.resumeDataUsed = resumeDataUsed;
    }

    public List<InterviewStep> getInterviewSteps() {
        return interviewSteps;
    }

    public void setInterviewSteps(List<InterviewStep> interviewSteps) {
        this.interviewSteps = interviewSteps;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getCoverLetterText() {
        return coverLetterText;
    }

    public void setCoverLetterText(String coverLetterText) {
        this.coverLetterText = coverLetterText;
    }
}
