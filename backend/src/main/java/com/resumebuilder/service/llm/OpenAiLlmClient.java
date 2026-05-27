package com.resumebuilder.service.llm;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.*;

@Component("OPENAI")
public class OpenAiLlmClient implements LlmClient {

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String generateResponse(String systemPrompt, String userPrompt, String apiKey) {
        String url = "https://api.openai.com/v1/chat/completions";
        
        try {
            // Build OpenAI JSON request structure safely
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "gpt-4o-mini");
            
            List<Map<String, String>> messages = new ArrayList<>();
            
            if (systemPrompt != null && !systemPrompt.trim().isEmpty()) {
                Map<String, String> sysMessage = new HashMap<>();
                sysMessage.put("role", "system");
                sysMessage.put("content", systemPrompt);
                messages.add(sysMessage);
            }
            
            Map<String, String> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            userMessage.put("content", userPrompt);
            messages.add(userMessage);
            
            requestBody.put("messages", messages);

            String jsonPayload = objectMapper.writeValueAsString(requestBody);

            String rawResponse = restClient.post()
                .uri(url)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .body(jsonPayload)
                .retrieve()
                .body(String.class);

            // Parse response safely: choices[0].message.content
            Map<String, Object> responseMap = objectMapper.readValue(rawResponse, Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseMap.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> choice = choices.get(0);
                Map<String, Object> message = (Map<String, Object>) choice.get("message");
                if (message != null) {
                    return (String) message.get("content");
                }
            }
            return rawResponse;
        } catch (Exception ex) {
            throw new RuntimeException("OpenAI API call failed: " + ex.getMessage(), ex);
        }
    }

    @Override
    public int estimateTokenCost(String input, String output) {
        return (input.length() + output.length()) / 4;
    }
}
