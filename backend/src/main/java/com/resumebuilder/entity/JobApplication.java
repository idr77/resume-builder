package com.resumebuilder.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
    @JsonIgnore
    private User user;

    @Column(name = "company_name", nullable = false, length = 255)
    private String companyName;

    @Column(name = "role_title", nullable = false, length = 255)
    private String roleTitle;

    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "applied_date", nullable = false, length = 100)
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

    @Column(name = "resume_version_id", length = 100)
    private String resumeVersionId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "cover_letter_text", columnDefinition = "TEXT")
    private String coverLetterText;

    @Column(name = "company_type", length = 50)
    private String companyType;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "contract_type", length = 50)
    private String contractType;

    @Column(name = "salary_expectation")
    private Double salaryExpectation;

    @Column(name = "salary_offer")
    private Double salaryOffer;

    @Column(name = "tjm_expectation")
    private Double tjmExpectation;

    @Column(name = "tjm_offer")
    private Double tjmOffer;

    @Column(name = "salary_estimate_ai_result", columnDefinition = "TEXT")
    private String salaryEstimateAiResult;

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("createdAt ASC")
    private List<InterviewStep> interviewSteps = new ArrayList<>();

    @Column(name = "created_at")
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

    public String getResumeVersionId() {
        return resumeVersionId;
    }

    public void setResumeVersionId(String resumeVersionId) {
        this.resumeVersionId = resumeVersionId;
    }

    public String getCompanyType() {
        return companyType;
    }

    public void setCompanyType(String companyType) {
        this.companyType = companyType;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getContractType() {
        return contractType;
    }

    public void setContractType(String contractType) {
        this.contractType = contractType;
    }

    public Double getSalaryExpectation() {
        return salaryExpectation;
    }

    public void setSalaryExpectation(Double salaryExpectation) {
        this.salaryExpectation = salaryExpectation;
    }

    public Double getSalaryOffer() {
        return salaryOffer;
    }

    public void setSalaryOffer(Double salaryOffer) {
        this.salaryOffer = salaryOffer;
    }

    public Double getTjmExpectation() {
        return tjmExpectation;
    }

    public void setTjmExpectation(Double tjmExpectation) {
        this.tjmExpectation = tjmExpectation;
    }

    public Double getTjmOffer() {
        return tjmOffer;
    }

    public void setTjmOffer(Double tjmOffer) {
        this.tjmOffer = tjmOffer;
    }

    public String getSalaryEstimateAiResult() {
        return salaryEstimateAiResult;
    }

    public void setSalaryEstimateAiResult(String salaryEstimateAiResult) {
        this.salaryEstimateAiResult = salaryEstimateAiResult;
    }
}
