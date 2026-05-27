package com.resumebuilder.service.llm;

public interface LlmClient {
    /**
     * Envoie une requête à l'IA spécifiée et retourne sa réponse.
     * @param systemPrompt Instructions système.
     * @param userPrompt Données de l'utilisateur (CV, offre).
     * @param apiKey Clé API à utiliser (système ou utilisateur déchiffrée).
     * @return La réponse générée.
     */
    String generateResponse(String systemPrompt, String userPrompt, String apiKey);
    
    /**
     * Estime le coût en jetons d'une requête/réponse.
     */
    int estimateTokenCost(String input, String output);
}
