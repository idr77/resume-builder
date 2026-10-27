import { describe, it, expect } from 'vitest';
import {
  buildAiChatSystemPrompt,
  buildChatPromptWithHistory,
  type ChatMessage,
} from '../aiChatService';
import { initialResumeState, type ResumeData } from '../../types/resume';
import type { JobApplication } from '../../types/tracker';

describe('aiChatService', () => {
  const sampleResume: ResumeData = {
    ...initialResumeState,
    language: 'fr',
    personalInfo: {
      fullName: 'Alexandre Dupont',
      jobTitle: 'Développeur Full Stack Senior',
      email: 'alex@example.com',
      phone: '0601020304',
      location: 'Paris, France',
    },
    summary: 'Expert React et Spring Boot avec 7 ans d’expérience.',
    skills: [
      { id: '1', name: 'TypeScript' },
      { id: '2', name: 'React' },
      { id: '3', name: 'Java' },
    ],
    experience: [
      {
        id: 'exp-1',
        company: 'Fintech Paris',
        role: 'Lead Dev Front',
        startDate: '2022',
        endDate: '2026',
        current: true,
        description: 'Refonte de la plateforme web.',
      },
    ],
  };

  it('generates system prompt including candidate CV data', () => {
    const prompt = buildAiChatSystemPrompt(sampleResume);
    expect(prompt).toContain('Alexandre Dupont');
    expect(prompt).toContain('Développeur Full Stack Senior');
    expect(prompt).toContain('TypeScript, React, Java');
    expect(prompt).toContain('Fintech Paris');
    expect(prompt).toContain('ESTIMATION SALARIALE & TJM');
  });

  it('incorporates targeted job application context into system prompt', () => {
    const mockApp: JobApplication = {
      id: 'app-1',
      companyName: 'Acme Corp',
      roleTitle: 'Architecte Cloud',
      jobDescription: 'Nous cherchons un Architecte Cloud AWS et Kubernetes.',
      appliedDate: '2026-05-01',
      status: 'interviewing',
      interviewSteps: [],
      salaryExpectation: 80000,
      tjmExpectation: 750,
      contractType: 'freelance',
      companyType: 'scaleup',
    };

    const prompt = buildAiChatSystemPrompt(sampleResume, mockApp);
    expect(prompt).toContain('Acme Corp');
    expect(prompt).toContain('Architecte Cloud');
    expect(prompt).toContain('Kubernetes');
    expect(prompt).toContain('750 €/jour');
    expect(prompt).toContain('80000 € brut/an');
  });

  it('formats chat history correctly into user prompt', () => {
    const history: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Quel est mon point fort ?',
        timestamp: '2026-05-01T10:00:00Z',
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Votre expertise React et Lead Dev.',
        timestamp: '2026-05-01T10:01:00Z',
      },
    ];

    const prompt = buildChatPromptWithHistory(history, 'Et mon salaire ?');
    expect(prompt).toContain('Quel est mon point fort ?');
    expect(prompt).toContain('Votre expertise React et Lead Dev.');
    expect(prompt).toContain('Et mon salaire ?');
  });

  it('handles empty chat history gracefully', () => {
    const prompt = buildChatPromptWithHistory([], 'Question directe');
    expect(prompt).toBe('Question directe');
  });
});
