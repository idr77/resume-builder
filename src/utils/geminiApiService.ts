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

export const translateResumeWithGemini = async (
  apiKey: string,
  resumeDataJson: string,
  targetLanguage: 'en' | 'fr'
): Promise<string> => {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please add it in settings.');
  }

  // Using a stable fast model
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const langInstruction = targetLanguage === 'fr' 
    ? 'Translate ALL content into rigorous professional French.' 
    : 'Translate ALL content into rigorous professional English.';

  const prompt = `
Role: You are an expert multilingual recruitment consultant.
Task: Translate the following JSON resume into the target language.
${langInstruction}

Constraints:
1. ONLY return the raw valid JSON object. Do not add markdown blocks like \`\`\`json. Do not add introductions or conversational text.
2. DO NOT modify any structural keys, IDs, or structural arrays. Keep the exact schema perfectly intact. Only translate the textual values.
3. Keep the "personalInfo.fullName", phone numbers, emails, school names, and locations as they natively are.
4. Translate all narrative text, bullets, summary, titles, descriptions, skills and languages accurately.
5. Make sure the output is strictly valid JSON format.

Resume JSON:
${resumeDataJson}
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
          temperature: 0.1, // Low temperature for deterministic precise translation
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to generate translation from Gemini API');
    }

    const data = await response.json();
    let generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Safety cleanup for markdown JSON blocks if the AI includes them anyway
    generatedText = generatedText.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();
    
    return generatedText;
  } catch (error: any) {
    console.error("Gemini Translation Error:", error);
    throw error;
  }
};
