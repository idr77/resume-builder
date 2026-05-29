export const rewriteExperienceWithGemini = async (
  apiKey: string,
  originalText: string,
  missingKeywords: string[],
  tone: string,
  language: 'en' | 'fr',
  customDirectives?: string
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

  const directivesInstruction = customDirectives && customDirectives.trim()
    ? `8. CRITICAL Directives: Adapt the content STRICTLY following these user instructions: "${customDirectives.trim()}". Maintain the exact tone, bullet points constraints, and facts while applying these custom requests.`
    : '';

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
${directivesInstruction}

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
  language: 'en' | 'fr',
  customDirectives?: string
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

  const directivesInstruction = customDirectives && customDirectives.trim()
    ? `5. CRITICAL Directives: Consolidate and select skills STRICTLY following these user instructions: "${customDirectives.trim()}". Maintain standard professional terms and comma-separated format.`
    : '';

  const prompt = `
Role: You are an expert recruitment consultant.
Task: Improve and consolidate the following list of professional skills.

Constraints:
1. Incorporate the following missing keywords naturally into the list if they are relevant skills: [${keywordsInstruction}].
2. Format the output STRICTLY as a single comma-separated list of skills. Do not add any bullet points, categories, or introductory phrases.
3. Remove redundancies and use professional terminology.
4. ${langInstruction}
${directivesInstruction}

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
Task: Analyze the following professional experiences and extract a highly relevant, curated list of technical and soft skills.

CONSTRAINTS & RULES (CRITICAL):
1. **Target Size**: Extract between 10 and 20 core skills max. Never exceed 25 skills.
2. **High-Level Core Skills Only**: List only the main technologies, frameworks, methodologies, or primary soft skills. Strictly avoid granular sub-features, libraries, or sub-topics.
   - YES: "Java", "React", "Node.js", "CI/CD", "Docker", "SQL", "Gestion de projet", "Scrum"
   - NO: "Java Streams", "Java Lambdas", "Java Multithreading", "React state", "React Hooks", "React Router", "Git branching", "API Restful"
3. **Consolidation**: Group similar or reduntant tools into their primary parent categories. Remove duplicates or near-duplicate phrases.
4. **Formatting**: Format the output STRICTLY as a single comma-separated list of skills (e.g. React, TypeScript, Node.js). Do NOT add bullet points, numbering, subcategories, or introductory text.
5. **Language**: The skills must be in ${langInstruction}.

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
    console.error("Gemini API Error in generateSkills:", error);
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
Task: Analyze the following job description and extract a highly refined list of key technical stacks, methodologies, and core soft skills.

CONSTRAINTS & RULES (CRITICAL):
1. **Target Size**: Extract between 8 and 15 keywords max. Never exceed 20 keywords.
2. **High-Level Core Skills Only**: List only the main technologies, frameworks, or core concepts. Do NOT list granular sub-features, libraries, or sub-methods.
   - YES: "Java", "React", "Node.js", "CI/CD", "Docker", "SQL"
   - NO: "Java Streams", "Java Lambdas", "Java Multithreading", "React state", "React Hooks", "React Router", "Node.js cluster"
3. **Consolidation**: Group similar tools into their main parent framework or category unless a tool is specifically emphasized as a mandatory hard skill.
4. **Formatting**: Return ONLY a raw valid JSON array of strings, e.g. ["React", "TypeScript", "Node.js", "Java", "Docker", "Agile"]. No markdown wrapping, no comments, no backticks.
5. **Language**: Return the keywords in the exact language of the job description (${language === 'fr' ? 'French' : 'English'}).

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
    const responseData = await response.json();
    const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Robust parsing: Find the first '[' and last ']' to extract the JSON array safely
    const startIdx = text.indexOf('[');
    const endIdx = text.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const cleanJson = text.slice(startIdx, endIdx + 1);
      return JSON.parse(cleanJson);
    }
    
    const cleaned = text.replace(/^```json\n?|```$/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error: any) {
    console.error("Gemini API Error in extractKeywords:", error);
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
  language: 'en' | 'fr',
  companyName?: string,
  roleTitle?: string,
  skillsDossierText?: string
): Promise<string> => {
    if (!apiKey) throw new Error('Gemini API Key is missing.');
    
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const langInstruction = language === 'fr' ? 'French' : 'English';
    
    // Dynamically calculate the current date in the correct language format
    const currentDate = new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let personalInfo: any = {};
    try {
      const parsed = JSON.parse(resumeJson);
      personalInfo = parsed.personalInfo || {};
    } catch (e) {
      console.warn("Failed to parse resume JSON in generateCoverLetterWithGemini", e);
    }
    
    const companySection = companyName ? `\n- Target Company: "${companyName}"` : '';
    const roleSection = roleTitle ? `\n- Target Role Title: "${roleTitle}"` : '';
    const dossierSection = skillsDossierText && skillsDossierText.trim()
      ? `\n- Candidate Master Background Document (Dossier de compétences):\n${skillsDossierText.trim()}\n`
      : '';

    const prompt = `
  Role: You are an expert career coach helping a candidate write a compelling, professional cover letter.
  Task: Write a complete motivation letter based on the provided JSON Resume and Job Description.
  Language: ${langInstruction}.
  Context:${companySection}${roleSection}
  ${dossierSection}
  
  Constraints:
  1. Return ONLY the letter text, formatted cleanly. Use standard formal letter structure.
  2. Do not use Markdown headings like # Cover Letter, but you can use newlines for paragraphs.
  
  3. **FORMAL SENDER HEADER (MANDATORY)**: At the very top of the letter, write the candidate's actual contact information from the CV:
     - Name: ${personalInfo.fullName || 'Candidate'}
     - Job Title: ${personalInfo.jobTitle || ''}
     - Email: ${personalInfo.email || ''}
     - Phone: ${personalInfo.phone || ''}
     - Location: ${personalInfo.location || ''}
     ${personalInfo.linkedin ? `- LinkedIn: ${personalInfo.linkedin}` : ''}
     ${personalInfo.portfolio ? `- Portfolio: ${personalInfo.portfolio}` : ''}
     
  4. **FORMAL DATE (MANDATORY)**: Place the current date exactly: "**${currentDate}**" aligned on the right before starting the body of the letter. Never use bracket placeholders like [Date] or [Date du jour].
  
  5. **FORMAL RECIPIENT HEADER (MANDATORY)**: Address the letter specifically "To the Hiring Team at ${companyName || 'the company'}" (or in French: "À l'attention de l'équipe de recrutement de ${companyName || 'l\'entreprise'}"). Do NOT use placeholders like [Hiring Manager] or [Nom du recruteur].
  
  6. **ZERO PLACEHOLDERS STRICT POLICY**: Do NOT include any bracketed text or text placeholders (e.g. \`[Date]\`, \`[Nom]\`, \`[Hiring Manager]\`, \`[Hiring Manager Name]\`, \`[Nom du recruteur]\`, \`[Adresse]\`, \`[Email]\`, \`[Téléphone]\`). All header information must be fully rendered using the candidate's actual details provided above.
  
  7. Make sure it directly addresses the requirements in the job description while highlighting the candidate's best relevant experiences.
  
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

export const generateInterviewPrepWithGemini = async (
  apiKey: string,
  resumeJson: string,
  jobDescription: string,
  stepTitle: string,
  skillsDossierText?: string,
  applicationNotes?: string,
  companyName?: string,
  roleTitle?: string
): Promise<string> => {
  if (!apiKey) throw new Error('Gemini API Key is missing.');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const dossierSection = skillsDossierText && skillsDossierText.trim()
    ? `\nCandidate Master Background Document (Dossier de compétences) :\n${skillsDossierText.trim()}\n`
    : '';

  const notesSection = applicationNotes && applicationNotes.trim()
    ? `\nGeneral Application Notes (Notes générales de la candidature) :\n${applicationNotes.trim()}\n`
    : '';

  const prompt = `
Role: You are an expert interview coach and career consultant.
Task: Create a highly customized, rigorous, and practical Interview Preparation Guide for the candidate based on the provided data.
Context:
- Target Company: "${companyName || 'Not specified'}"
- Target Role Title: "${roleTitle || 'Not specified'}"
- The candidate is preparing for the specific interview step: "${stepTitle}".
- Target Job Description: "${jobDescription || 'Not specified'}"
- Candidate Resume (JSON): "${resumeJson}"
${dossierSection}
${notesSection}

Constraints:
1. Output format: Standard Markdown. Do not include markdown JSON blocks or introductory phrases like "Here is your guide". Start directly with the markdown content.
2. The language of the guide must match the step title's language. If the title is in French ("Entretien Technique", "Fit"), write entirely in French. If in English, write entirely in English.
3. Keep the content deeply aligned with the candidate's actual projects, technologies, and achievements mentioned in the resume and background documents. DO NOT invent details or projects.

4. CRITICAL - Technical Interview Round Detection & Adaptability:
   - If the step title "${stepTitle}" or the description mentions keywords like "technique", "coding", "quiz", "codingame", "test", "live coding" or lists specific technologies (e.g. "Java", "Angular", "React", "Python", "SQL"):
     - Treat this as a highly technical round.
     - Under the section "### 💻 Sujets techniques & Méthodes à réviser", you MUST dynamically tailor the content to prepare the candidate for these exact technologies (e.g. concurrent programming or garbage collection in Java, state management or component lifecycle in React/Angular).
     - You MUST include a dedicated subsection named "#### 🧠 Exercices de Coding / Debugging Pratique" within the tech review section. Generate 1 or 2 concrete exercises (e.g., typical Codingame puzzles, algorithms, or code snippets with bugs to debug) along with their elegant, optimal solutions and key explanations.
     - Analyze the target Job Description to extract other key tech stacks, skills, or methodologies (e.g. SQL indexes, Docker, CI/CD pipelines) and integrate them in this technical preparation guide.

5. Structure the guide strictly into the following sections:
   - ### 🎯 Objectifs de l'étape [Step Objectives]: Define the main focus of this step (HR, Technical, or Culture/Fit) and what the interviewer is evaluating.
   - ### ❓ Top 5 Questions & Réponses sur-mesure [Top 5 Custom Questions & Answers]: Write 5 highly probable questions for this step. For each question, provide a detailed, tailored answer using the candidate's actual experience bullet points (under the STAR framework if behavioral, or precise architectures/technologies if technical).
   - ### 💻 Sujets techniques & Méthodes à réviser [Topics to Review]: Focus on specific tech stacks (e.g. React, Node, System Design) corresponding to this step. Include the technical coding exercises block here if a technical round is detected.
   - ### 💬 Questions intelligentes à poser [Smart Questions to Ask]: Provide 3 deep, non-obvious questions for the candidate to ask the interviewer.
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 } })
    });
    if (!response.ok) throw new Error('Failed to generate interview prep from Gemini API');
    return (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (error: any) {
    console.error("Gemini Interview Prep Error:", error);
    throw error;
  }
};

export const generateAtsAdviceWithGemini = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  if (!apiKey) throw new Error('Gemini API Key is missing.');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
        ],
        generationConfig: { temperature: 0.5 }
      })
    });
    if (!response.ok) throw new Error('Failed to generate ATS advice from Gemini API');
    return (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (error: any) {
    console.error("Gemini ATS Advice Error:", error);
    throw error;
  }
};
