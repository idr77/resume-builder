import { NormalizedITSkills } from './itSkillsDictionary';
import type { ResumeData } from '../types/resume';

export interface TitleAnalysis {
  match: 'exact' | 'partial' | 'none';
  resumeTitle: string;
  targetTitle: string;
  recommendation: string;
}

export interface ContactAnalysis {
  hasEmail: boolean;
  hasPhone: boolean;
  hasLinkedIn: boolean;
  hasPortfolio: boolean;
  missingCrucial: string[];
  score: number; // 0 to 100
}

export interface ActionVerbsAnalysis {
  foundVerbs: string[];
  count: number;
  score: number; // 0 to 100
  recommendations: string[];
}

export interface OptimizationResult {
  matchScore: number;
  foundKeywords: string[];
  missingKeywords: string[];
  targetKeywords: string[];
  titleAnalysis: TitleAnalysis;
  contactAnalysis: ContactAnalysis;
  actionVerbsAnalysis: ActionVerbsAnalysis;
}

// Action Verbs Dictionaries for ATS scanning
const ACTION_VERBS_FR = [
  'géré', 'piloté', 'développé', 'conçu', 'dirigé', 'optimisé', 'accéléré', 'déployé', 'créé', 
  'élaboré', 'résolu', 'négocié', 'conduit', 'coordonné', 'supervisé', 'analysé', 'implémenté', 
  'administré', 'structuré', 'propulsé', 'augmenté', 'réduit', 'conduit', 'concrétisé', 'dirigé'
];

const ACTION_VERBS_EN = [
  'managed', 'piloted', 'developed', 'designed', 'directed', 'optimized', 'accelerated', 'deployed', 
  'created', 'established', 'resolved', 'negotiated', 'conducted', 'coordinated', 'supervised', 
  'analyzed', 'implemented', 'administered', 'structured', 'spearheaded', 'pioneered', 'improved', 
  'increased', 'reduced', 'led', 'built', 'achieved', 'delivered', 'facilitated', 'maximized'
];

export const extractJDKeywords = (jdText: string): string[] => {
  if (!jdText) return [];
  
  const keywordsFound = new Set<string>();
  const normalizedJd = jdText.toLowerCase();

  NormalizedITSkills.forEach(skill => {
    if (skill.includes(' ')) {
      if (normalizedJd.includes(skill)) {
        keywordsFound.add(skill);
      }
    } else {
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
      if (regex.test(normalizedJd)) {
        keywordsFound.add(skill);
      }
    }
  });

  return Array.from(keywordsFound);
};

// Heuristic to extract target job title from Job Description
export const extractTargetJobTitle = (jdText: string): string => {
  if (!jdText) return '';
  const lines = jdText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  // Look for prefixes like "Title:", "Role:", "Poste:", "Job:"
  const prefixRegex = /^(job\s+)?(title|role|position|poste|intitulé)\s*:\s*(.+)$/i;
  for (const line of lines.slice(0, 5)) {
    const match = line.match(prefixRegex);
    if (match && match[3]) {
      return match[3].trim();
    }
  }

  // Fallback: Use the first short line (under 50 chars) which is likely the title
  for (const line of lines.slice(0, 3)) {
    if (line.length > 3 && line.length < 50) {
      return line;
    }
  }

  return lines[0].slice(0, 40);
};

export const analyzeResumeMatch = (resumeData: ResumeData, extraKeywords: string[] = []): OptimizationResult => {
  const jdText = resumeData.targetJobDescription || '';
  const baseTargetKeywords = extractJDKeywords(jdText);
  const targetKeywords = Array.from(new Set([...baseTargetKeywords, ...extraKeywords]));
  const language = resumeData.language;

  // 1. Title Match Analysis
  const resumeTitle = resumeData.personalInfo.jobTitle || '';
  const targetTitle = extractTargetJobTitle(jdText);
  let titleMatch: 'exact' | 'partial' | 'none' = 'none';
  let titleRec = '';

  if (targetTitle && resumeTitle) {
    const cleanResume = resumeTitle.toLowerCase().trim();
    const cleanTarget = targetTitle.toLowerCase().trim();
    
    if (cleanResume === cleanTarget) {
      titleMatch = 'exact';
      titleRec = language === 'fr' 
        ? "Parfait ! Le titre de votre CV correspond exactement à l'offre." 
        : "Perfect! Your resume title matches the job offer exactly.";
    } else {
      // Check for partial matches (shared words)
      const resumeWords = cleanResume.split(/\s+/).filter(w => w.length > 3);
      const targetWords = cleanTarget.split(/\s+/).filter(w => w.length > 3);
      const hasIntersection = resumeWords.some(w => targetWords.includes(w));
      
      if (hasIntersection) {
        titleMatch = 'partial';
        titleRec = language === 'fr'
          ? `Correspondance partielle. Envisagez de renommer en "${targetTitle}" pour maximiser le score ATS.`
          : `Partial match. Consider renaming to exact "${targetTitle}" to maximize your ATS indexing.`;
      } else {
        titleMatch = 'none';
        titleRec = language === 'fr'
          ? `Incohérence détectée. Votre titre est "${resumeTitle}" mais l'offre cible "${targetTitle}". Adaptez le titre.`
          : `Mismatch detected. Your title is "${resumeTitle}" but the job targets "${targetTitle}". Align your title.`;
      }
    }
  } else {
    titleRec = language === 'fr'
      ? "Collez une annonce pour comparer le titre de votre CV avec le poste ciblé."
      : "Paste a job description to analyze how well your job title aligns.";
  }

  // 2. Contact Completeness Analysis
  const hasEmail = !!resumeData.personalInfo.email;
  const hasPhone = !!resumeData.personalInfo.phone;
  const hasLinkedIn = !!resumeData.personalInfo.linkedin;
  const hasPortfolio = !!resumeData.personalInfo.portfolio;
  
  const missingCrucial: string[] = [];
  if (!hasEmail) missingCrucial.push(language === 'fr' ? 'Email' : 'Email');
  if (!hasPhone) missingCrucial.push(language === 'fr' ? 'Téléphone' : 'Phone');
  
  let contactScore = 0;
  if (hasEmail) contactScore += 40;
  if (hasPhone) contactScore += 40;
  if (hasLinkedIn) contactScore += 10;
  if (hasPortfolio) contactScore += 10;

  const contactAnalysis: ContactAnalysis = {
    hasEmail,
    hasPhone,
    hasLinkedIn,
    hasPortfolio,
    missingCrucial,
    score: contactScore
  };

  // 3. Action Verbs Analysis
  const resumeTextParts = [
    resumeData.personalInfo.jobTitle,
    resumeData.summary,
    ...resumeData.experience.map(e => `${e.role} ${e.company} ${e.description}`),
    ...resumeData.education.map(e => `${e.degree} ${e.school} ${e.description}`),
    ...resumeData.skills.map(s => s.name),
    ...resumeData.resumeLanguages.map(l => l.name)
  ];
  const combinedResumeText = resumeTextParts.join('\n').toLowerCase();
  
  const verbsList = language === 'fr' ? ACTION_VERBS_FR : ACTION_VERBS_EN;
  const foundVerbs: string[] = [];
  
  verbsList.forEach(verb => {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    if (regex.test(combinedResumeText)) {
      foundVerbs.push(verb);
    }
  });

  const verbCount = foundVerbs.length;
  let verbScore = Math.min(100, Math.round((verbCount / 5) * 100)); // Target at least 5 action verbs
  
  const verbRecs: string[] = [];
  if (verbCount < 3) {
    verbRecs.push(language === 'fr' 
      ? "Utilisez plus de verbes d'action au début de vos puces d'expérience pour dynamiser l'impact robot et recruteur."
      : "Use more strong action verbs at the beginning of your bullet points to maximize dynamic impact.");
  } else {
    verbRecs.push(language === 'fr'
      ? `Excellent ! Vous utilisez ${verbCount} verbes d'action pertinents pour illustrer vos réalisations.`
      : `Excellent! You use ${verbCount} strong action verbs to depict your milestones.`);
  }

  const actionVerbsAnalysis: ActionVerbsAnalysis = {
    foundVerbs,
    count: verbCount,
    score: verbScore,
    recommendations: verbRecs
  };

  // 4. Keywords score
  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];

  targetKeywords.forEach(keyword => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return;

    const escapedSkill = trimmedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startBoundary = /^\w/.test(trimmedKeyword) ? '\\b' : '';
    const endBoundary = /\w$/.test(trimmedKeyword) ? '\\b' : '';
    const regex = new RegExp(`${startBoundary}${escapedSkill}${endBoundary}`, 'i');
    
    if (regex.test(combinedResumeText)) {
      foundKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  });

  const matchScore = targetKeywords.length === 0 
    ? 0 
    : Math.round((foundKeywords.length / targetKeywords.length) * 100);

  return {
    matchScore,
    foundKeywords,
    missingKeywords,
    targetKeywords,
    titleAnalysis: {
      match: titleMatch,
      resumeTitle,
      targetTitle,
      recommendation: titleRec
    },
    contactAnalysis,
    actionVerbsAnalysis
  };
};
