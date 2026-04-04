export interface PersonalInfo {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  portfolio?: string;
  photoUrl?: string; // Newly added
}

export interface Experience {
  id: string; // Unique identifier for mapping
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
}

export interface Interest {
  id: string;
  name: string;
}

export interface ResumeLanguage {
  id: string;
  name: string;
  level: number; // 1 to 3
}

// Support multiple languages internally
export type Language = 'en' | 'fr';

export interface ResumeData {
  language: Language;
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  resumeLanguages: ResumeLanguage[];
  interests: Interest[]; // Newly added
  targetJobDescription?: string; // Newly added for ATS Optimizer
}

export const initialResumeState: ResumeData = {
  language: 'en',
  personalInfo: {
    fullName: 'Jane Doe',
    jobTitle: 'Senior Software Engineer',
    email: 'jane.doe@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/janedoe',
    portfolio: 'janedoe.dev',
    photoUrl: ''
  },
  summary: 'Passionate software engineer with over 8 years of experience in building scalable web applications. Adept in React, Node.js, and cloud infrastructure.',
  experience: [
    {
      id: "exp-1",
      company: 'Tech Solutions Inc.',
      role: 'Senior Full Stack Engineer',
      location: 'San Francisco, CA',
      startDate: '2020',
      endDate: 'Present',
      current: true,
      description: '• Spearheaded the development of a microservices architecture.\n• Improved application performance by 40%.\n• Mentored a team of 5 junior developers.'
    }
  ],
  education: [
    {
      id: "edu-1",
      school: 'University of Technology',
      degree: 'B.S. in Computer Science',
      startDate: '2012',
      endDate: '2016',
      description: 'Graduated with Honors. Focused on distributed systems and HCI.'
    }
  ],
  skills: [
    { id: 'sk-1', name: 'React' },
    { id: 'sk-2', name: 'TypeScript' },
    { id: 'sk-3', name: 'Node.js' }
  ],
  resumeLanguages: [
    { id: 'lang-1', name: 'English', level: 3 },
    { id: 'lang-2', name: 'French', level: 2 }
  ],
  interests: [
    { id: 'int-1', name: 'Open Source Software' },
    { id: 'int-2', name: 'Photography' }
  ],
  targetJobDescription: ''
};
