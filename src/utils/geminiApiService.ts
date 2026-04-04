export const rewriteExperienceWithGemini = async (
  apiKey: string,
  originalText: string,
  missingKeywords: string[],
  tone: string,
  language: 'en' | 'fr'
): Promise<string> => {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please add it in settings.');
  }

  // Using a stable fast model
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const langInstruction = language === 'fr' 
    ? 'Write the response entirely in French.' 
    : 'Write the response entirely in English.';

  const keywordsInstruction = missingKeywords.length > 0 
    ? missingKeywords.join(', ') 
    : 'None';

  const prompt = `
Role: You are an expert recruitment consultant.
Task: Rewrite the following professional experience bullet points.
Tone: ${tone}

Constraints:
1. Incorporate the following missing keywords naturally if relevant to the context: [${keywordsInstruction}]. Do not force them if they make no sense.
2. Use impactful action verbs (e.g., Managed, Developed, Accelerated).
3. Maintain the exact original meaning and facts (do not invent metrics).
4. STRICT: Do NOT add any invisible text, fake labels, or "hack" phrases. The output must be 100% human-readable and professional.
5. Length: Keep it concise and format the output strictly as bullet points starting with a bullet (•). Do NOT add introductory phrases like "Here is your rewrite". Just output the bullet points.
6. ${langInstruction}

Original Text:
${originalText}
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to generate content from Gemini API');
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return generatedText.trim();
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
