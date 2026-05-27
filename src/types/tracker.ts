import type { ResumeData } from './resume';

export interface InterviewStep {
  id: string;
  title: string; // Ex: "Entretien RH", "Entretien technique", "Fit"
  date?: string;
  status: 'pending' | 'completed' | 'failed';
  notes: string; // Notes formatted in Markdown
  aiPrep?: string; // AI generated preparation plan
}

export type ApplicationStatus = 'draft' | 'applied' | 'interviewing' | 'offer' | 'rejected';

export interface JobApplication {
  id: string;
  companyName: string;
  roleTitle: string;
  jobDescription: string;
  appliedDate: string;
  status: ApplicationStatus;
  interviewSteps: InterviewStep[];
  skillsDossierText?: string;
  skillsDossierFileName?: string;
  resumeDataUsed?: ResumeData; // The CV data snapshot at application time
  notes?: string; // General application notes / comments
}
