package com.resumebuilder.service;

import com.resumebuilder.entity.*;
import com.resumebuilder.repository.*;
import com.resumebuilder.service.llm.LlmClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.UUID;

@Service
public class AiGatewayService {

    private final ApplicationContext context;
    private final UserApiKeyRepository apiKeyRepository;
    private final UserTokensQuotaRepository quotaRepository;
    private final TokenUsageLogRepository logRepository;
    private final UserRepository userRepository;
    private final EncryptionService encryptionService;

    @Value("${app.security.global-gemini-key:}") // Fallback to empty if not configured
    private String globalGeminiKey;

    public AiGatewayService(ApplicationContext context, 
                             UserApiKeyRepository apiKeyRepository,
                             UserTokensQuotaRepository quotaRepository,
                             TokenUsageLogRepository logRepository,
                             UserRepository userRepository,
                             EncryptionService encryptionService) {
        this.context = context;
        this.apiKeyRepository = apiKeyRepository;
        this.quotaRepository = quotaRepository;
        this.logRepository = logRepository;
        this.userRepository = userRepository;
        this.encryptionService = encryptionService;
    }

    @Transactional
    public String requestAiService(UUID userId, String systemPrompt, String userPrompt, String preferredProvider) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));

        // 1. Check if the user has their own API key configured for the preferred provider
        Optional<UserApiKey> userKeyOpt = apiKeyRepository.findByUserIdAndProvider(userId, preferredProvider);

        if (userKeyOpt.isPresent()) {
            UserApiKey apiKeyEntity = userKeyOpt.get();
            try {
                // Decrypt user key
                String plainKey = encryptionService.decrypt(
                    apiKeyEntity.getEncryptedApiKey(), 
                    apiKeyEntity.getEncryptionIv()
                );
                
                LlmClient client = (LlmClient) context.getBean(preferredProvider);
                return client.generateResponse(systemPrompt, userPrompt, plainKey);
            } catch (Exception ex) {
                throw new RuntimeException("Échec du déchiffrement de votre clé d'API personnelle : " + ex.getMessage(), ex);
            }
        }

        // 2. Otherwise, use global system key and enforce credit limits
        if (globalGeminiKey == null || globalGeminiKey.trim().isEmpty()) {
            throw new IllegalArgumentException("Aucune clé API personnelle configurée, et le serveur ne possède pas de clé globale active.");
        }

        UserTokensQuota quota = quotaRepository.findByUserId(userId)
            .orElseGet(() -> {
                // Initialize default free tier with 50,000 tokens
                UserTokensQuota newQuota = new UserTokensQuota(user, 50000, "FREE");
                return quotaRepository.save(newQuota);
            });

        // Enforce quota limits for FREE tier
        boolean isPro = "PRO".equals(quota.getSubscriptionStatus());
        if (!isPro && quota.getTokenBalance() <= 0) {
            throw new IllegalStateException("Votre solde de jetons gratuits est épuisé. Veuillez configurer votre clé d'API personnelle dans les paramètres.");
        }

        // Rough pre-estimate cost to lock credit
        int estimatedCost = (systemPrompt.length() + userPrompt.length()) / 4;
        
        // Deduct preventatively
        if (!isPro) {
            quota.setTokenBalance(Math.max(0, quota.getTokenBalance() - estimatedCost));
            quotaRepository.save(quota);
        }

        // Default global client is Google Gemini
        LlmClient defaultClient = (LlmClient) context.getBean("GEMINI");
        String response = defaultClient.generateResponse(systemPrompt, userPrompt, globalGeminiKey);

        // Adjust real cost after response is completed
        int realCost = defaultClient.estimateTokenCost(systemPrompt + userPrompt, response);
        
        if (!isPro) {
            int adjustment = estimatedCost - realCost;
            quota.setTokenBalance(Math.max(0, quota.getTokenBalance() + adjustment));
            quotaRepository.save(quota);
        }

        // Log consumption
        logRepository.save(new TokenUsageLog(user, "AI_REQUEST", "SYSTEM_GEMINI", realCost));

        return response;
    }
}
