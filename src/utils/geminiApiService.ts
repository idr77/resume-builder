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
5. Length: Keep it concise and format the output strictly as a Markdown bullet list using dashes (-). Do NOT use bullet points (•) or dot points. Do NOT add introductory phrases like "Here is your rewrite". Just output the bullet points.
6. IMPORTANT: If the original text contains titles in bold before bullet lists (e.g. **Title:**), keep these titles exactly unmodified and positioned before the bullet lists they introduce.
7. ${langInstruction}

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

export const rewriteSkillsWithGemini = async (
  apiKey: string,
  originalSkills: string,
  missingKeywords: string[],
  language: 'en' | 'fr'
): Promise<string> => {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please add it in settings.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const langInstruction = language === 'fr' 
    ? 'Write the response entirely in French.' 
    : 'Write the response entirely in English.';

  const keywordsInstruction = missingKeywords.length > 0 
    ? missingKeywords.join(', ') 
    : 'None';

  const prompt = `
Role: You are an expert recruitment consultant.
Task: Improve and consolidate the following list of professional skills.

Constraints:
1. Incorporate the following missing keywords naturally into the list if they are relevant skills: [${keywordsInstruction}].
2. Format the output STRICTLY as a single comma-separated list of skills. Do not add any bullet points, categories, or introductory phrases.
3. Remove redundancies and use professional terminology.
4. ${langInstruction}

Original Skills:
${originalSkills}
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

export const generateSkillsFromExperienceWithGemini = async (
  apiKey: string,
  experiences: { role: string; company: string; description: string }[],
  language: 'en' | 'fr'
): Promise<string> => {
  if (!apiKey) throw new Error('Gemini API Key is missing. Please add it in settings.');
  if (experiences.length === 0) return '';
  
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const langInstruction = language === 'fr' ? 'French' : 'English';
  
  const expText = experiences.map(e => `Role: ${e.role}\nCompany: ${e.company}\nDescription: ${e.description}`).join('\n\n');

  const prompt = `
Role: You are an expert recruiter.
Task: Extract a comprehensive list of technical and soft skills from the following professional experiences.
Constraints:
1. Format the output STRICTLY as a single comma-separated list of skills. Do not add any bullet points, categories, or introductory phrases.
2. The skills must be in ${langInstruction}.
3. Remove redundancies and use standard professional terminology.

Experiences:
${expText}
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 } })
    });
    if (!response.ok) throw new Error('Failed to generate skills');
    return (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const extractKeywordsWithGemini = async (
  apiKey: string,
  jobDescription: string,
  language: 'en' | 'fr'
): Promise<string[]> => {
  if (!apiKey) throw new Error('Gemini API Key is missing.');
  if (!jobDescription) return [];
  
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `
Task: Extract key skills, technical keywords, and soft skills from the following job description.
Constraints:
1. ONLY return a raw JSON array of strings: ["keyword1", "keyword2"]. No markdown formatting, no comments.
2. Extract the most important and representative terms. Keep phrases if they represent a single concept (e.g. "project management").

Job Description:
${jobDescription}
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } })
    });
    if (!response.ok) throw new Error('Failed to extract keywords');
    let text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    text = text.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return [];
  }
};

export const globalOptimizeResumeWithGemini = async (
  apiKey: string,
  resumeJson: string,
  detailedDocument: string,
  jobDescription: string,
  language: 'en' | 'fr'
): Promise<string> => {
  if (!apiKey) throw new Error('Gemini API Key is missing.');
  
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const langInstruction = language === 'fr' ? 'French' : 'English';
  
  const prompt = `
Role: You are an expert recruiter and resume writer.
Task: Improve the provided JSON resume's 'experience' and 'summary' sections using the detailed experiences document.
Context:
- The user has provided a raw, detailed document about their past experiences.
- (Optional) A target Job Description is provided to emphasize the right skills and achievements.
- Language: output must be in ${langInstruction}.

Constraints:
1. ONLY return the raw valid JSON object for the resume. Do not add markdown blocks like \`\`\`json.
2. DO NOT modify any structural keys or IDs. Keep the exact schema perfectly intact. Only improve the narrative text, bullets, summary, and descriptions.
3. Incorporate facts and metrics from the detailed document.
4. Align the tone and highlighted skills with the Job Description if provided.
5. Strict JSON format output.

Target Job Description (if any):
${jobDescription || 'None provided'}

Detailed Experiences Document:
${detailedDocument}

Original Resume JSON:
${resumeJson}
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 } })
    });
    if (!response.ok) throw new Error('Failed to generate optimized resume');
    let text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();
    return text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateCoverLetterWithGemini = async (
  apiKey: string,
  resumeJson: string,
  jobDescription: string,
  language: 'en' | 'fr'
): Promise<string> => {
    if (!apiKey) throw new Error('Gemini API Key is missing.');
    
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const langInstruction = language === 'fr' ? 'French' : 'English';
    
    const prompt = `
  Role: You are an expert career coach helping a candidate write a compelling, professional cover letter.
  Task: Write a complete motivation letter based on the provided JSON Resume and Job Description.
  Language: ${langInstruction}.
  
  Constraints:
  1. Return ONLY the letter text, formatted cleanly. Use standard formal letter structure.
  2. Do not use Markdown headings like # Cover Letter, but you can use newlines for paragraphs.
  3. Include placeholders like [Date], [Hiring Manager Name] if needed, but infer details (like the user's name) from the JSON resume.
  4. Make sure it directly addresses the requirements in the job description while highlighting the candidate's best relevant experiences.
  
  Job Description:
  ${jobDescription || 'General application'}
  
  Resume JSON:
  ${resumeJson}
    `;
  
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 } })
      });
      if (!response.ok) throw new Error('Failed to generate cover letter');
      return (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  };
