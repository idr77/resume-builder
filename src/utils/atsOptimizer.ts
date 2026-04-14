import { NormalizedITSkills } from './itSkillsDictionary';
import type { ResumeData } from '../types/resume';

export interface OptimizationResult {
  matchScore: number;
  foundKeywords: string[];
  missingKeywords: string[];
  targetKeywords: string[];
}

export const extractJDKeywords = (jdText: string): string[] => {
  if (!jdText) return [];
  
  const keywordsFound = new Set<string>();
  const normalizedJd = jdText.toLowerCase();

  NormalizedITSkills.forEach(skill => {
    // For phrases containing spaces (e.g., 'machine learning')
    if (skill.includes(' ')) {
      if (normalizedJd.includes(skill)) {
        keywordsFound.add(skill);
      }
    } else {
      // Use regex word boundaries for single words to avoid partial matches
      // Escape special chars like + in C++
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
      if (regex.test(normalizedJd)) {
        keywordsFound.add(skill);
      }
    }
  });

  return Array.from(keywordsFound);
};

export const analyzeResumeMatch = (resumeData: ResumeData, extraKeywords: string[] = []): OptimizationResult => {
  const jdText = resumeData.targetJobDescription || '';
  const baseTargetKeywords = extractJDKeywords(jdText);
  // Merge and deduplicate
  const targetKeywords = Array.from(new Set([...baseTargetKeywords, ...extraKeywords]));

  if (targetKeywords.length === 0) {
    return { matchScore: 0, foundKeywords: [], missingKeywords: [], targetKeywords: [] };
  }

  // Combine all relevant resume text into one large lowecase string
  const resumeTextParts = [
    resumeData.personalInfo.jobTitle,
    resumeData.summary,
    ...resumeData.experience.map(e => `${e.role} ${e.company} ${e.description}`),
    ...resumeData.education.map(e => `${e.degree} ${e.school} ${e.description}`),
    ...resumeData.skills.map(s => s.name),
    ...resumeData.interests.map(i => i.name)
  ];
  const combinedResumeText = resumeTextParts.join('\n').toLowerCase();

  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];

  targetKeywords.forEach(keyword => {
    let isFound = false;
    if (keyword.includes(' ')) {
      isFound = combinedResumeText.includes(keyword);
    } else {
      const escapedSkill = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
      isFound = regex.test(combinedResumeText);
    }

    if (isFound) {
      foundKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  });

  const matchScore = Math.round((foundKeywords.length / targetKeywords.length) * 100);

  return {
    matchScore,
    foundKeywords,
    missingKeywords,
    targetKeywords
  };
};
