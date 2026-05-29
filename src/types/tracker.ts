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
  resumeVersionId?: string; // The ID of the resume version associated
  notes?: string; // General application notes / comments
  coverLetterText?: string; // Tailored motivation letter for this specific application
  
  // Salary/TJM estimation and simulation fields
  companyType?: 'startup' | 'scaleup' | 'pme' | 'esn' | 'grand_groupe' | '';
  location?: string;
  contractType?: 'cdi' | 'freelance' | '';
  salaryExpectation?: number;
  salaryOffer?: number;
  tjmExpectation?: number;
  tjmOffer?: number;
  salaryEstimateAiResult?: string;
}
