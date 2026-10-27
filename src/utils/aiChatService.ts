import type { ResumeData } from '../types/resume';
import type { JobApplication } from '../types/tracker';
import { apiService } from './apiService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatRequestOptions {
  resumeData: ResumeData;
  application?: JobApplication | null;
  history: ChatMessage[];
  userMessage: string;
  apiKey?: string;
  isCloudConnected?: boolean;
}

/**
 * Builds a structured system prompt injecting the current candidate CV context
 * and any targeted job offer or active application.
 */
export const buildAiChatSystemPrompt = (
  resumeData: ResumeData,
  application?: JobApplication | null
): string => {
  const isFrench = resumeData.language === 'fr';

  // Candidate summary from CV
  const name = resumeData.personalInfo.fullName || 'Candidat';
  const title = resumeData.personalInfo.jobTitle || 'Non spécifié';
  const location = resumeData.personalInfo.location || 'France';
  const summary = resumeData.summary || 'Non renseigné';
  const skillsList = resumeData.skills.map(s => s.name).join(', ') || 'Aucune';

  const experiencesList = resumeData.experience.map(exp => {
    return `- ${exp.role} chez ${exp.company} (${exp.startDate} - ${exp.current ? 'Présent' : exp.endDate}) : ${exp.description.replace(/\n+/g, ' ')}`;
  }).join('\n');

  const educationList = resumeData.education.map(edu => {
    return `- ${edu.degree} - ${edu.school} (${edu.startDate} - ${edu.endDate})`;
  }).join('\n');

  // Targeted offer details
  const targetJd = resumeData.targetJobDescription || '';
  let offerContext = '';

  if (application) {
    offerContext = `
=== CANDIDATURE EN COURS ===
- Entreprise ciblée : ${application.companyName || 'Non spécifié'}
- Poste ciblé : ${application.roleTitle || 'Non spécifié'}
- Statut actuel : ${application.status || 'Non spécifié'}
- Type d'entreprise : ${application.companyType || 'Non spécifié'}
- Type de contrat : ${application.contractType || 'Non spécifié'}
- Localisation du poste : ${application.location || 'Non spécifié'}
- Prétentions salariales indiquées : ${application.salaryExpectation ? `${application.salaryExpectation} € brut/an` : 'Non renseigné'}
- Salaire proposé par l'entreprise : ${application.salaryOffer ? `${application.salaryOffer} € brut/an` : 'Non renseigné'}
- TJM souhaité (Freelance) : ${application.tjmExpectation ? `${application.tjmExpectation} €/jour` : 'Non renseigné'}
- TJM proposé : ${application.tjmOffer ? `${application.tjmOffer} €/jour` : 'Non renseigné'}
- Description de l'offre :
"""
${application.jobDescription || targetJd || 'Aucune description fournie.'}
"""
${application.skillsDossierText ? `- Dossier de compétences spécifique :\n"""\n${application.skillsDossierText}\n"""` : ''}
${application.notes ? `- Notes personnelles sur l'échange :\n"""\n${application.notes}\n"""` : ''}
`;
  } else if (targetJd) {
    offerContext = `
=== OFFRE D'EMPLOI CIBLÉE (DEPUIS L'ÉDITEUR) ===
"""
${targetJd}
"""
`;
  } else {
    offerContext = `
=== AUCUNE OFFRE SPÉCIFIQUE SÉLECTIONNÉE ===
Le candidat n'a pas encore renseigné d'offre ciblée. Basez vos conseils sur son profil général de CV, ou invitez-le à coller une annonce s'il le souhaite.
`;
  }

  return `
Vous êtes l'Assistant IA Carrière & Recrutement expert du ResumeBuilder ATS.
Votre mission : Conseiller le candidat de façon ultra-personnalisée, concrète et percutante sur son CV, ses compétences, son positionnement de marché et son estimation salariale/TJM.

=== CONTEXTE DU CANDIDAT ===
- Nom : ${name}
- Titre professionnel : ${title}
- Localisation : ${location}
- Résumé / Pitch : ${summary}
- Compétences actuelles : ${skillsList}
- Expériences professionnelles :
${experiencesList || 'Aucune expérience renseignée.'}
- Formation :
${educationList || 'Aucune formation renseignée.'}

${offerContext}

=== VOS DOMAINES D'EXPERTISE PRIORITAIRES ===
1. 🎯 ANALYSE DES COMPÉTENCES & GAPS :
   - Identifier les compétences clés (hard & soft) demandées dans l'offre qui manquent ou sont sous-exposées dans le CV.
   - Expliquer concrètement comment formuler ou enrichir ses expériences pour mettre en avant ces compétences (avec résultats chiffrés, mots-clés ATS).
   - Recommander des certifications, projets ou technologies complémentaires valorisantes.

2. 💰 ESTIMATION SALARIALE & TJM (2026) :
   - Fournir des fourchettes salariales réalistes basées sur le marché tech/cadres français et européen actuel (CDI brut annuel, net mensuel estimé).
   - En cas de freelance : donner le TJM marché moyen, minimum et haut de fourchette (HT), avec conversion en portage salarial (environ 48-52% de net) ou micro-entreprise / SASU.
   - Adapter l'estimation selon la séniorité, la localisation (Paris / Régions / Remote) et la typologie de boîte (Startup, Scale-up, Grand Groupe, ESN).
   - Fournir 2 ou 3 arguments solides (chiffres, réalisations du CV) pour négocier ou justifier la tranche haute.

3. 🚀 OPTIMISATION ATS & ENTRETIEN :
   - Réponses directes, percutantes, sans tournures creuses ni formules de politesse superflues.
   - Structuration claire en Markdown (titres ###, puces -, gras pour les termes importants).
   - Langue : Répondez en ${isFrench ? 'Français' : 'Anglais'} sauf si le message de l'utilisateur est dans une autre langue.
`.trim();
};

/**
 * Builds the combined user prompt incorporating previous chat history turns.
 */
export const buildChatPromptWithHistory = (
  history: ChatMessage[],
  newMessage: string
): string => {
  if (!history || history.length === 0) {
    return newMessage;
  }

  // Keep last 8 messages for context window efficiency
  const recentHistory = history.slice(-8);
  const formattedHistory = recentHistory
    .map(msg => `${msg.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  return `Historique récent de la discussion :\n${formattedHistory}\n\nNouvelle question de l'utilisateur :\n${newMessage}`;
};

/**
 * Sends a chat message to Gemini via backend proxy or direct client call.
 */
export const sendAiChatMessage = async ({
  resumeData,
  application,
  history,
  userMessage,
  apiKey,
  isCloudConnected = false,
}: ChatRequestOptions): Promise<string> => {
  const systemPrompt = buildAiChatSystemPrompt(resumeData, application);
  const userPrompt = buildChatPromptWithHistory(history, userMessage);

  // If connected to Cloud backend, use proxyLlm
  if (isCloudConnected && apiService.isLoggedIn()) {
    try {
      const response = await apiService.proxyLlm(systemPrompt, userPrompt, 'GEMINI');
      if (response && response.trim()) {
        return response.trim();
      }
    } catch (cloudErr: any) {
      console.warn('Cloud proxy failed, attempting direct Gemini fallback if key exists:', cloudErr);
      // If we have an apiKey locally, fall through to direct call
      if (!apiKey) {
        throw cloudErr;
      }
    }
  }

  // Fallback to direct Gemini API call
  const activeKey = apiKey || localStorage.getItem('gemini_api_key');
  if (!activeKey) {
    throw new Error(
      resumeData.language === 'fr'
        ? 'Clé API Gemini introuvable. Veuillez renseigner votre clé API dans les Paramètres.'
        : 'Gemini API Key missing. Please provide it in Settings.'
    );
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey.trim()}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Erreur Gemini API (${response.status}: ${response.statusText})`
    );
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Aucune réponse générée par Gemini.');
  }

  return text.trim();
};
