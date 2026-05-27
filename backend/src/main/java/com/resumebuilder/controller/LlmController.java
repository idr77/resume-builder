package com.resumebuilder.controller;

import com.resumebuilder.service.AiGatewayService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/llm")
public class LlmController {

    private final AiGatewayService aiGatewayService;

    public LlmController(AiGatewayService aiGatewayService) {
        this.aiGatewayService = aiGatewayService;
    }

    private UUID getAuthenticatedUserId() {
        String userIdStr = (String) SecurityContextHolder.getContext().getAuthentication().getCredentials();
        return UUID.fromString(userIdStr);
    }

    @PostMapping("/proxy")
    public ResponseEntity<?> proxyAiRequest(@RequestBody Map<String, String> payload) {
        UUID userId = getAuthenticatedUserId();
        String systemPrompt = payload.get("systemPrompt");
        String userPrompt = payload.get("userPrompt");
        String provider = payload.getOrDefault("provider", "GEMINI");

        if (userPrompt == null || userPrompt.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Le paramètre userPrompt est obligatoire."));
        }

        try {
            String aiResponse = aiGatewayService.requestAiService(userId, systemPrompt, userPrompt, provider);
            return ResponseEntity.ok(Map.of("response", aiResponse));
        } catch (IllegalStateException ex) {
            // Insufficient quota (tokens balance exhausted)
            return ResponseEntity.status(402).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of("error", "L'appel de l'API d'IA a échoué: " + ex.getMessage()));
        }
    }
}
