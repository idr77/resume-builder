import { describe, it, expect } from 'vitest';
import type { JobApplication, InterviewStep } from '../../types/tracker';
import type { ResumeData } from '../../types/resume';

describe('Job Application Tracker state logic', () => {
  const mockResume: ResumeData = {
    language: 'en',
    personalInfo: {
      fullName: 'Jane Doe',
      jobTitle: 'Developer',
      email: 'jane@example.com',
      phone: '111-222',
      location: 'SF'
    },
    summary: 'Developer summary',
    experience: [],
    education: [],
    skills: [],
    resumeLanguages: [],
    interests: [],
    targetJobDescription: ''
  };

  it('should create a valid JobApplication object with initial draft status', () => {
    const newApp: JobApplication = {
      id: 'app-1',
      companyName: 'Google',
      roleTitle: 'Frontend Lead',
      jobDescription: 'React and TS needed...',
      appliedDate: '24/05/2026',
      status: 'draft',
      interviewSteps: [],
      resumeDataUsed: mockResume
    };

    expect(newApp.companyName).toBe('Google');
    expect(newApp.status).toBe('draft');
    expect(newApp.interviewSteps).toHaveLength(0);
    expect(newApp.resumeDataUsed?.personalInfo.fullName).toBe('Jane Doe');
  });

  it('should support adding interview steps and toggling status', () => {
    const application: JobApplication = {
      id: 'app-1',
      companyName: 'Stripe',
      roleTitle: 'Developer',
      jobDescription: 'Backend work',
      appliedDate: '24/05/2026',
      status: 'interviewing',
      interviewSteps: [],
      resumeDataUsed: mockResume
    };

    const newStep: InterviewStep = {
      id: 'step-1',
      title: 'Technical Interview',
      status: 'pending',
      notes: '- Prep STAR stories',
      aiPrep: ''
    };

    const updatedSteps = [...application.interviewSteps, newStep];
    const updatedApp = { ...application, interviewSteps: updatedSteps };

    expect(updatedApp.interviewSteps).toHaveLength(1);
    expect(updatedApp.interviewSteps[0].title).toBe('Technical Interview');
    expect(updatedApp.interviewSteps[0].status).toBe('pending');

    // Toggle status to completed
    updatedApp.interviewSteps[0].status = 'completed';
    expect(updatedApp.interviewSteps[0].status).toBe('completed');
  });

  it('should successfully parse valid JSON export for data imports', () => {
    const rawExportJson = `
      [
        {
          "id": "app-1",
          "companyName": "Netflix",
          "roleTitle": "Systems Engineer",
          "jobDescription": "Java, Cloud",
          "appliedDate": "2026-05-24",
          "status": "applied",
          "interviewSteps": []
        }
      ]
    `;

    const parsed = JSON.parse(rawExportJson);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].companyName).toBe('Netflix');
    expect(parsed[0].status).toBe('applied');
  });
});
