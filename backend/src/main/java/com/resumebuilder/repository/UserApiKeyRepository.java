package com.resumebuilder.repository;

import com.resumebuilder.entity.UserApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserApiKeyRepository extends JpaRepository<UserApiKey, UUID> {
    Optional<UserApiKey> findByUserIdAndProvider(UUID userId, String provider);
}
