package com.resumebuilder.service.llm;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.*;

@Component("GEMINI")
public class GeminiLlmClient implements LlmClient {

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String generateResponse(String systemPrompt, String userPrompt, String apiKey) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
        
        try {
            // Build request structure robustly using nested Maps
            Map<String, Object> requestBody = new HashMap<>();
            
            // Contents list
            List<Map<String, Object>> contents = new ArrayList<>();
            Map<String, Object> contentMap = new HashMap<>();
            List<Map<String, Object>> parts = new ArrayList<>();
            Map<String, Object> partMap = new HashMap<>();
            partMap.put("text", userPrompt);
            parts.add(partMap);
            contentMap.put("parts", parts);
            contents.add(contentMap);
            requestBody.put("contents", contents);

            // System instruction if present
            if (systemPrompt != null && !systemPrompt.trim().isEmpty()) {
                Map<String, Object> systemInstruction = new HashMap<>();
                List<Map<String, Object>> sysParts = new ArrayList<>();
                Map<String, Object> sysPartMap = new HashMap<>();
                sysPartMap.put("text", systemPrompt);
                sysParts.add(sysPartMap);
                systemInstruction.put("parts", sysParts);
                requestBody.put("systemInstruction", systemInstruction);
            }

            // Serialize robustly
            String jsonPayload = objectMapper.writeValueAsString(requestBody);

            String rawResponse = restClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .body(jsonPayload)
                .retrieve()
                .body(String.class);

            // Extract the generated text from Gemini's nested response structure:
            // candidates[0].content.parts[0].text
            Map<String, Object> responseMap = objectMapper.readValue(rawResponse, Map.class);
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<String, Object> candidate = candidates.get(0);
                Map<String, Object> content = (Map<String, Object>) candidate.get("content");
                if (content != null) {
                    List<Map<String, Object>> respParts = (List<Map<String, Object>>) content.get("parts");
                    if (respParts != null && !respParts.isEmpty()) {
                        return (String) respParts.get(0).get("text");
                    }
                }
            }
            return rawResponse; // Return raw as fallback
        } catch (Exception ex) {
            throw new RuntimeException("Gemini API call failed: " + ex.getMessage(), ex);
        }
    }

    @Override
    public int estimateTokenCost(String input, String output) {
        // Safe character-based fallback (1 token ~ 4 characters in English/French)
        return (input.length() + output.length()) / 4;
    }
}
