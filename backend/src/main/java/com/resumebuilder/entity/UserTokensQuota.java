package com.resumebuilder.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_tokens_quota")
public class UserTokensQuota {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "token_balance", nullable = false)
    private Integer tokenBalance = 50000;

    @Column(name = "subscription_status", nullable = false, length = 50)
    private String subscriptionStatus = "FREE";

    @Column(name = "subscription_ends_at")
    private OffsetDateTime subscriptionEndsAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public UserTokensQuota() {}

    public UserTokensQuota(User user, Integer tokenBalance, String subscriptionStatus) {
        this.user = user;
        this.userId = user.getId();
        this.tokenBalance = tokenBalance;
        this.subscriptionStatus = subscriptionStatus;
    }

    // Getters and Setters
    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
        if (user != null) {
            this.userId = user.getId();
        }
    }

    public Integer getTokenBalance() {
        return tokenBalance;
    }

    public void setTokenBalance(Integer tokenBalance) {
        this.tokenBalance = tokenBalance;
    }

    public String getSubscriptionStatus() {
        return subscriptionStatus;
    }

    public void setSubscriptionStatus(String subscriptionStatus) {
        this.subscriptionStatus = subscriptionStatus;
    }

    public OffsetDateTime getSubscriptionEndsAt() {
        return subscriptionEndsAt;
    }

    public void setSubscriptionEndsAt(OffsetDateTime subscriptionEndsAt) {
        this.subscriptionEndsAt = subscriptionEndsAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
