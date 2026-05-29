import { describe, it, expect } from 'vitest';
import { extractJDKeywords, extractTargetJobTitle, analyzeResumeMatch } from '../atsOptimizer';
import type { ResumeData } from '../../types/resume';

describe('extractJDKeywords', () => {
  it('should extract known IT skills from text', () => {
    const text = 'We are looking for a Software Engineer proficient in React, TypeScript, and Node.js.';
    const keywords = extractJDKeywords(text);
    
    expect(keywords).toContain('react');
    expect(keywords).toContain('typescript');
    expect(keywords).toContain('node.js');
  });

  it('should return empty array for empty job description', () => {
    expect(extractJDKeywords('')).toEqual([]);
  });
});

describe('extractTargetJobTitle', () => {
  it('should extract title from prefix "Title:"', () => {
    const jd = 'Role: Lead React Developer\nSkills required...';
    expect(extractTargetJobTitle(jd)).toBe('Lead React Developer');
  });

  it('should fallback to first short line if no prefix is found', () => {
    const jd = 'Senior Backend Engineer\nWe are looking for a developer...';
    expect(extractTargetJobTitle(jd)).toBe('Senior Backend Engineer');
  });
});

describe('analyzeResumeMatch', () => {
  const mockResume: ResumeData = {
    language: 'en',
    personalInfo: {
      fullName: 'John Doe',
      jobTitle: 'Software Engineer',
      email: 'john@example.com',
      phone: '123-456',
      location: 'Paris',
      linkedin: 'linkedin.com/john',
      portfolio: 'john.dev'
    },
    summary: 'A passionate developer with years of experience.',
    experience: [
      {
        id: '1',
        company: 'Corp',
        role: 'Developer',
        startDate: '2020',
        endDate: '2022',
        current: false,
        description: '• Developed a cool React app.\n• Optimized the database query time.'
      }
    ],
    education: [],
    skills: [
      { id: '1', name: 'React' },
      { id: '2', name: 'TypeScript' }
    ],
    resumeLanguages: [],
    interests: [],
    targetJobDescription: 'Title: Software Engineer\nReact, Node.js'
  };

  it('should calculate matchScore correctly', () => {
    const result = analyzeResumeMatch(mockResume);
    // Target keywords from JD: react, node.js
    // Found in resume: react (in experience, skills)
    // Missing: node.js
    // Match score: 50%
    expect(result.matchScore).toBe(50);
  });

  it('should detect exact job title match', () => {
    const result = analyzeResumeMatch(mockResume);
    expect(result.titleAnalysis.match).toBe('exact');
  });

  it('should calculate contact completeness score', () => {
    const result = analyzeResumeMatch(mockResume);
    // Has email, phone, linkedin, portfolio = 100/100
    expect(result.contactAnalysis.score).toBe(100);
  });

  it('should scan and count action verbs correctly', () => {
    const result = analyzeResumeMatch(mockResume);
    // Found action verbs in description: "developed", "optimized" (from English actions list)
    expect(result.actionVerbsAnalysis.count).toBe(2);
    expect(result.actionVerbsAnalysis.foundVerbs).toContain('developed');
  });

  it('should match skills directly in the skills array and support special characters like C++, .NET, C#', () => {
    const customResume: ResumeData = {
      ...mockResume,
      skills: [
        { id: '1', name: 'C++' },
        { id: '2', name: '.NET' },
        { id: '3', name: 'C#' },
        { id: '4', name: 'Tailwind CSS' }
      ]
    };
    const result = analyzeResumeMatch(customResume, ['C++', '.NET', 'C#', 'Tailwind CSS']);
    expect(result.foundKeywords).toContain('C++');
    expect(result.foundKeywords).toContain('.NET');
    expect(result.foundKeywords).toContain('C#');
    expect(result.foundKeywords).toContain('Tailwind CSS');
    expect(result.missingKeywords).not.toContain('C++');
  });
});
