import React, { useState, useEffect } from 'react';
import type { JobApplication, InterviewStep, ApplicationStatus } from '../../types/tracker';
import type { ResumeData } from '../../types/resume';
import { generateInterviewPrepWithGemini, generateCoverLetterWithGemini, generateAtsAdviceWithGemini } from '../../utils/geminiApiService';
import { apiService } from '../../utils/apiService';
import { ArrowLeft, Plus, Trash2, Sparkles, Loader2, Calendar, FileText, CheckCircle, Clock, XCircle, Save, FileUp, Copy, Share2 } from 'lucide-react';
import MarkdownRenderer from '../Common/MarkdownRenderer';

interface Props {
  application: JobApplication;
  activeResumeData: ResumeData;
  onBack: () => void;
  onUpdate: (app: JobApplication) => void;
  language: 'en' | 'fr';
}

const parseMarkdownToHtml = (md: string) => {
  if (!md) return '';
  
  let escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = escaped.split('\n');
  let inList = false;
  const processedLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('### ')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      const headerText = trimmed.substring(4);
      processedLines.push(`<h4 style="color: #80397b; font-size: 14px; font-weight: bold; margin-top: 14px; margin-bottom: 6px; font-family: 'Segoe UI', sans-serif;">${headerText}</h4>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      const headerText = trimmed.substring(3);
      processedLines.push(`<h3 style="color: #80397b; font-size: 16px; font-weight: bold; margin-top: 16px; margin-bottom: 8px; font-family: 'Segoe UI', sans-serif;">${headerText}</h3>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      const headerText = trimmed.substring(2);
      processedLines.push(`<h2 style="color: #80397b; font-size: 18px; font-weight: bold; margin-top: 18px; margin-bottom: 10px; font-family: 'Segoe UI', sans-serif;">${headerText}</h2>`);
      continue;
    }

    const listMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
    if (listMatch) {
      if (!inList) {
        processedLines.push('<ul style="margin: 4px 0 12px 20px; padding: 0; list-style-type: disc; font-family: \'Segoe UI\', sans-serif;">');
        inList = true;
      }
      const content = listMatch[3];
      let inlineItem = content;
      inlineItem = inlineItem.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      inlineItem = inlineItem.replace(/__(.*?)__/g, '<strong>$1</strong>');
      inlineItem = inlineItem.replace(/\*(.*?)\*/g, '<em>$1</em>');
      inlineItem = inlineItem.replace(/_(.*?)_/g, '<em>$1</em>');
      inlineItem = inlineItem.replace(/`(.*?)`/g, '<code style="background-color: #f3f4f6; color: #1f2937; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>');
      processedLines.push(`<li style="margin-bottom: 4px; font-family: 'Segoe UI', sans-serif; font-size: 13px; color: #374151;">${inlineItem}</li>`);
      continue;
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
    }

    let inlineLine = line;
    inlineLine = inlineLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    inlineLine = inlineLine.replace(/__(.*?)__/g, '<strong>$1</strong>');
    inlineLine = inlineLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
    inlineLine = inlineLine.replace(/_(.*?)_/g, '<em>$1</em>');
    inlineLine = inlineLine.replace(/`(.*?)`/g, '<code style="background-color: #f3f4f6; color: #1f2937; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>');

    if (trimmed === '') {
      processedLines.push('<br />');
    } else {
      processedLines.push(`<div style="margin-bottom: 4px; font-family: 'Segoe UI', sans-serif; font-size: 13px; color: #374151;">${inlineLine}</div>`);
    }
  }

  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('\n');
};

const statusColors: Record<ApplicationStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  applied: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-800',
  interviewing: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-100 dark:border-amber-800',
  offer: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-100 dark:border-red-800'
};

export default function ApplicationDetail({ application, activeResumeData, onBack, onUpdate, language }: Props) {
  const [appStatus, setAppStatus] = useState<ApplicationStatus>(application.status);
  const [jdText, setJdText] = useState(application.jobDescription);
  
  // Timeline Step States
  const [activeStepId, setActiveStepId] = useState<string | null>(
    application.interviewSteps && application.interviewSteps.length > 0 ? application.interviewSteps[0].id : null
  );
  const [newStepTitle, setNewStepTitle] = useState('');
  
  // AI Prep States
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const [aiError, setAiError] = useState('');

  // Skills Dossier File State
  const [fileName, setFileName] = useState(application.skillsDossierFileName || '');
  const [dossierText, setDossierText] = useState(application.skillsDossierText || '');

  // Cover Letter States
  const [coverLetterText, setCoverLetterText] = useState(application.coverLetterText || '');
  const [coverLetterMode, setCoverLetterMode] = useState<'edit' | 'preview'>('preview');
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);

  // Local notes state for typing and save status
  const [notesText, setNotesText] = useState('');
  const [appNotes, setAppNotes] = useState(application.notes || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Toggle modes for markdown fields
  const [dossierMode, setDossierMode] = useState<'edit' | 'preview'>('preview');
  const [notesMode, setNotesMode] = useState<'edit' | 'preview'>('edit');

  const isFrench = language === 'fr';

  // CDI/Freelance Salary & TJM Estimation and Simulation States
  const [compCompanyType, setCompCompanyType] = useState<'startup' | 'scaleup' | 'pme' | 'esn' | 'grand_groupe' | ''>(application.companyType || '');
  const [compLocation, setCompLocation] = useState(application.location || '');
  const [compContractType, setCompContractType] = useState<'cdi' | 'freelance' | ''>(application.contractType || '');
  const [compSalaryExpectation, setCompSalaryExpectation] = useState<number | undefined>(application.salaryExpectation);
  const [compSalaryOffer, setCompSalaryOffer] = useState<number | undefined>(application.salaryOffer);
  const [compTjmExpectation, setCompTjmExpectation] = useState<number | undefined>(application.tjmExpectation);
  const [compTjmOffer, setCompTjmOffer] = useState<number | undefined>(application.tjmOffer);
  const [compSalaryEstimateAiResult, setCompSalaryEstimateAiResult] = useState(application.salaryEstimateAiResult || '');
  const [isEstimatingSalary, setIsEstimatingSalary] = useState(false);

  // Associated CV versions list
  const [cvVersions, setCvVersions] = useState<{ id: string; name: string; updatedAt: string; data: ResumeData }[]>([]);

  const loadCvVersions = async () => {
    try {
      const online = await apiService.checkHealth();
      if (online && apiService.isLoggedIn()) {
        const cloudVersions = await apiService.fetchVersions();
        setCvVersions(cloudVersions.map(v => ({ id: v.id, name: v.name, updatedAt: v.updatedAt, data: v.data })));
        return;
      }
    } catch (e) {
      console.warn("Offline or unauthenticated, falling back to local resumes for association.");
    }

    try {
      const stored = localStorage.getItem('ats_resumes_history');
      if (stored) {
        setCvVersions(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load resume history in ApplicationDetail", e);
    }
  };

  useEffect(() => {
    loadCvVersions();
  }, []);

  const handleAssociateActiveCv = () => {
    const confirmMsg = isFrench 
      ? "Associer le CV actuellement actif dans l'éditeur à cette candidature ?" 
      : "Associate the current active builder CV with this application?";
    if (!window.confirm(confirmMsg)) return;

    updateApplication({
      resumeDataUsed: activeResumeData,
      resumeVersionId: 'active'
    });
  };

  const handleAssociateCv = (versionId: string) => {
    const version = cvVersions.find(v => v.id === versionId);
    if (!version) return;

    const confirmMsg = isFrench 
      ? `Associer la version "${version.name}" à cette candidature ?`
      : `Associate version "${version.name}" with this application?`;
    if (!window.confirm(confirmMsg)) return;

    updateApplication({
      resumeDataUsed: version.data,
      resumeVersionId: versionId
    });
  };

  // OneNote Export States & Methods
  const [oneNotePrefix, setOneNotePrefix] = useState<'Opportunité' | 'Candidature' | 'Entretien' | 'custom'>('Opportunité');
  const [oneNoteCustomPrefix, setOneNoteCustomPrefix] = useState('');
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [showOneNotePanel, setShowOneNotePanel] = useState(false);

  // Initialize prefix when application status changes
  useEffect(() => {
    if (appStatus === 'interviewing') {
      setOneNotePrefix('Entretien');
    } else if (appStatus === 'draft') {
      setOneNotePrefix('Opportunité');
    } else {
      setOneNotePrefix('Candidature');
    }
  }, [appStatus]);

  const getPrefixString = () => {
    if (oneNotePrefix === 'custom') {
      return oneNoteCustomPrefix.trim() || (isFrench ? 'Candidature' : 'Application');
    }
    return oneNotePrefix;
  };

  const getOneNotePageTitle = () => {
    return `${getPrefixString()} ${application.companyName}`;
  };

  const handleCopyTitle = async () => {
    try {
      await navigator.clipboard.writeText(getOneNotePageTitle());
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } catch (err) {
      console.error('Failed to copy title', err);
    }
  };

  const handleCopyContent = async () => {
    const title = getOneNotePageTitle();
    
    // 1. Generate text/html blob (Premium Inline Styles for OneNote)
    const stepsHtml = currentSteps.length > 0 ? `
      <div style="margin-bottom: 28px;">
        <h3 style="color: #80397b; font-size: 18px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 16px; font-family: 'Segoe UI', sans-serif;">
          🗓️ ${isFrench ? 'Étapes & Entretiens' : 'Recruitment Steps & Timeline'}
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; text-align: left; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; font-family: 'Segoe UI', sans-serif;">
          <thead>
            <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 12px 16px; font-weight: bold; color: #374151; border: 1px solid #e5e7eb;">${isFrench ? 'Étape' : 'Step'}</th>
              <th style="padding: 12px 16px; font-weight: bold; color: #374151; width: 120px; border: 1px solid #e5e7eb;">${isFrench ? 'Statut' : 'Status'}</th>
              <th style="padding: 12px 16px; font-weight: bold; color: #374151; border: 1px solid #e5e7eb;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${currentSteps.map((step, idx) => `
              <tr style="border-bottom: 1px solid #e5e7eb; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding: 14px 16px; font-weight: 600; color: #1f2937; vertical-align: top; border: 1px solid #e5e7eb;">
                  ${step.title}
                </td>
                <td style="padding: 14px 16px; vertical-align: top; border: 1px solid #e5e7eb;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-align: center; text-transform: uppercase; 
                    background-color: ${step.status === 'completed' ? '#d1fae5' : step.status === 'failed' ? '#fee2e2' : '#fef3c7'}; 
                    color: ${step.status === 'completed' ? '#065f46' : step.status === 'failed' ? '#991b1b' : '#92400e'}; border: 1px solid ${step.status === 'completed' ? '#bbf7d0' : step.status === 'failed' ? '#fecaca' : '#fef3c7'};">
                    ${step.status === 'completed' ? (isFrench ? 'Complété' : 'Completed') : step.status === 'failed' ? (isFrench ? 'Échoué' : 'Failed') : (isFrench ? 'À venir' : 'Pending')}
                  </span>
                </td>
                <td style="padding: 14px 16px; color: #4b5563; line-height: 1.5; vertical-align: top; border: 1px solid #e5e7eb;">
                  ${step.notes ? `<div style="margin-bottom: 8px;">${parseMarkdownToHtml(step.notes)}</div>` : `<span style="color: #9ca3af; font-style: italic;">${isFrench ? 'Aucune note' : 'No notes'}</span>`}
                  ${step.aiPrep ? `
                    <div style="margin-top: 12px; background-color: #f5f3ff; border: 1px dashed #c084fc; padding: 12px; border-radius: 6px; font-size: 12px;">
                      <strong style="color: #6b21a8; display: block; margin-bottom: 4px;">✨ ${isFrench ? 'Coaching de Préparation IA' : 'AI Interview Coach'} :</strong>
                      <div>${parseMarkdownToHtml(step.aiPrep)}</div>
                    </div>
                  ` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; color: #333333; line-height: 1.6; padding: 10px;">
        <!-- Header Banner -->
        <div style="background-color: #80397b; color: #ffffff; padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 8px solid #4c1d95;">
          <h1 style="margin: 0; font-size: 26px; font-weight: bold; color: #ffffff;">${application.companyName}</h1>
          <h2 style="margin: 6px 0 0 0; font-size: 18px; font-weight: 500; color: #e9d5ff;">${application.roleTitle}</h2>
          <div style="margin-top: 14px; font-size: 12px;">
            <strong style="background-color: rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 4px; margin-right: 10px;">Statut : ${appStatus.toUpperCase()}</strong>
            <strong style="background-color: rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 4px;">Date : ${application.appliedDate}</strong>
          </div>
        </div>

        <!-- Notes -->
        ${appNotes ? `
          <div style="margin-bottom: 28px;">
            <h3 style="color: #80397b; font-size: 18px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; font-family: 'Segoe UI', sans-serif;">
              📝 ${isFrench ? 'Notes Générales' : 'General Notes'}
            </h3>
            <div style="background-color: #fcfaff; border-left: 4px solid #80397b; padding: 14px 18px; border-radius: 0 8px 8px 0;">
              ${parseMarkdownToHtml(appNotes)}
            </div>
          </div>
        ` : ''}

        <!-- Steps Timeline -->
        ${stepsHtml}

        <!-- Skills Dossier -->
        ${dossierText ? `
          <div style="margin-bottom: 28px;">
            <h3 style="color: #80397b; font-size: 18px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; font-family: 'Segoe UI', sans-serif;">
              💼 ${isFrench ? 'Dossier de Compétences & Notes Techniques' : 'Skills Dossier & Tech Notes'}
            </h3>
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px;">
              ${parseMarkdownToHtml(dossierText)}
            </div>
          </div>
        ` : ''}

        <!-- Cover Letter -->
        ${coverLetterText ? `
          <div style="margin-bottom: 28px;">
            <h3 style="color: #80397b; font-size: 18px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; font-family: 'Segoe UI', sans-serif;">
              ✉️ ${isFrench ? 'Lettre de Motivation' : 'Cover Letter'}
            </h3>
            <div style="background-color: #fcfcfc; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
              ${parseMarkdownToHtml(coverLetterText)}
            </div>
          </div>
        ` : ''}

        <!-- Job Description -->
        ${jdText ? `
          <div style="margin-bottom: 28px;">
            <h3 style="color: #80397b; font-size: 18px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; font-family: 'Segoe UI', sans-serif;">
              📋 ${isFrench ? 'Description du Poste' : 'Job Description'}
            </h3>
            <div style="background-color: #fafafa; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px;">
              ${parseMarkdownToHtml(jdText)}
            </div>
          </div>
        ` : ''}

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-top: 30px; margin-bottom: 10px;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: right; font-style: italic; font-family: 'Segoe UI', sans-serif;">
          ${isFrench ? 'Candidature exportée depuis ATS Resume Builder.' : 'Application exported from ATS Resume Builder.'}
        </p>
      </div>
    `;

    // 2. Generate clean markdown/plain text fallback
    let plainText = `# ${title}\n\n`;
    plainText += `**${isFrench ? 'Statut' : 'Status'}**: ${appStatus.toUpperCase()}\n`;
    plainText += `**Date**: ${application.appliedDate}\n\n`;
    
    if (appNotes) {
      plainText += `## 📝 ${isFrench ? 'Notes Générales' : 'General Notes'}\n${appNotes}\n\n`;
    }
    
    if (currentSteps.length > 0) {
      plainText += `## 🗓️ ${isFrench ? 'Étapes & Entretiens' : 'Recruitment Steps & Timeline'}\n`;
      currentSteps.forEach(s => {
        plainText += `### ${s.title} [${s.status.toUpperCase()}]\n`;
        if (s.notes) plainText += `${s.notes}\n`;
        if (s.aiPrep) plainText += `\n*✨ Prep Coach AI*:\n${s.aiPrep}\n`;
        plainText += `\n`;
      });
    }
    
    if (dossierText) {
      plainText += `## 💼 ${isFrench ? 'Dossier de Compétences' : 'Skills Dossier'}\n${dossierText}\n\n`;
    }
    
    if (coverLetterText) {
      plainText += `## ✉️ ${isFrench ? 'Lettre de Motivation' : 'Cover Letter'}\n${coverLetterText}\n\n`;
    }
    
    if (jdText) {
      plainText += `## 📋 ${isFrench ? 'Description du Poste' : 'Job Description'}\n${jdText}\n\n`;
    }

    try {
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({
        'text/plain': textBlob,
        'text/html': htmlBlob,
      });
      await navigator.clipboard.write([clipboardItem]);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    } catch (err) {
      console.error('Failed to copy rich text: ', err);
      try {
        await navigator.clipboard.writeText(plainText);
        setCopiedContent(true);
        setTimeout(() => setCopiedContent(false), 2000);
      } catch (fallbackErr) {
        alert(isFrench ? 'Impossible de copier dans le presse-papier.' : 'Could not copy to clipboard.');
      }
    }
  };

  // Sync state if application changes
  useEffect(() => {
    setAppNotes(application.notes || '');
    setJdText(application.jobDescription);
    setDossierText(application.skillsDossierText || '');
    setFileName(application.skillsDossierFileName || '');
    setAppStatus(application.status);
    setCoverLetterText(application.coverLetterText || '');

    // Sync salary simulation states
    setCompCompanyType(application.companyType || '');
    setCompLocation(application.location || '');
    setCompContractType(application.contractType || '');
    setCompSalaryExpectation(application.salaryExpectation);
    setCompSalaryOffer(application.salaryOffer);
    setCompTjmExpectation(application.tjmExpectation);
    setCompTjmOffer(application.tjmOffer);
    setCompSalaryEstimateAiResult(application.salaryEstimateAiResult || '');

    // Reset activeStepId to the first step of the new application
    const steps = application.interviewSteps || [];
    const firstStepId = steps.length > 0 ? steps[0].id : null;
    setActiveStepId(firstStepId);

    const step = steps.find(s => s.id === firstStepId);
    setNotesText(step ? step.notes || '' : '');

    // Reset Edit/Preview toggles
    setDossierMode('preview');
    setNotesMode('edit');
    setCoverLetterMode('preview');
  }, [application.id]);

  // Timeline Step Notes syncing effect
  useEffect(() => {
    const step = (application.interviewSteps || []).find(s => s.id === activeStepId);
    setNotesText(step ? step.notes || '' : '');
  }, [activeStepId, application.interviewSteps]);

  const saveAllPendingChanges = async (
    nextNotes = notesText, 
    nextDossier = dossierText, 
    nextJd = jdText, 
    nextStatus = appStatus,
    nextAppNotes = appNotes,
    nextCoverLetter = coverLetterText,
    nextCompanyType = compCompanyType,
    nextLocation = compLocation,
    nextContractType = compContractType,
    nextSalaryExpectation = compSalaryExpectation,
    nextSalaryOffer = compSalaryOffer,
    nextTjmExpectation = compTjmExpectation,
    nextTjmOffer = compTjmOffer,
    nextSalaryEstimateAiResult = compSalaryEstimateAiResult
  ) => {
    setSaveStatus('saving');
    try {
      const updatedSteps = (application.interviewSteps || []).map(s => {
        if (s.id === activeStepId) {
          return { ...s, notes: nextNotes };
        }
        return s;
      });

      const updatedApp: JobApplication = {
        ...application,
        status: nextStatus,
        jobDescription: nextJd,
        skillsDossierText: nextDossier,
        skillsDossierFileName: fileName,
        interviewSteps: updatedSteps,
        notes: nextAppNotes,
        coverLetterText: nextCoverLetter,
        companyType: nextCompanyType,
        location: nextLocation,
        contractType: nextContractType,
        salaryExpectation: nextSalaryExpectation,
        salaryOffer: nextSalaryOffer,
        tjmExpectation: nextTjmExpectation,
        tjmOffer: nextTjmOffer,
        salaryEstimateAiResult: nextSalaryEstimateAiResult
      };

      onUpdate(updatedApp);
      setSaveStatus('saved');
    } catch (err) {
      console.error("Failed to save application changes", err);
      setSaveStatus('error');
    }
    setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000);
  };

  // Debounced Auto-save effect
  useEffect(() => {
    const step = (application.interviewSteps || []).find(s => s.id === activeStepId);
    const currentNotes = step ? step.notes || '' : '';
    
    const hasNotesChanged = notesText !== currentNotes;
    const hasDossierChanged = dossierText !== (application.skillsDossierText || '');
    const hasJdChanged = jdText !== application.jobDescription;
    const hasAppNotesChanged = appNotes !== (application.notes || '');
    const hasCoverLetterChanged = coverLetterText !== (application.coverLetterText || '');
    const hasCompanyTypeChanged = compCompanyType !== (application.companyType || '');
    const hasLocationChanged = compLocation !== (application.location || '');
    const hasContractTypeChanged = compContractType !== (application.contractType || '');
    const hasSalaryExpectationChanged = compSalaryExpectation !== application.salaryExpectation;
    const hasSalaryOfferChanged = compSalaryOffer !== application.salaryOffer;
    const hasTjmExpectationChanged = compTjmExpectation !== application.tjmExpectation;
    const hasTjmOfferChanged = compTjmOffer !== application.tjmOffer;
    const hasSalaryEstimateAiResultChanged = compSalaryEstimateAiResult !== (application.salaryEstimateAiResult || '');

    if (
      !hasNotesChanged && 
      !hasDossierChanged && 
      !hasJdChanged && 
      !hasAppNotesChanged && 
      !hasCoverLetterChanged &&
      !hasCompanyTypeChanged &&
      !hasLocationChanged &&
      !hasContractTypeChanged &&
      !hasSalaryExpectationChanged &&
      !hasSalaryOfferChanged &&
      !hasTjmExpectationChanged &&
      !hasTjmOfferChanged &&
      !hasSalaryEstimateAiResultChanged
    ) return;

    const timer = setTimeout(() => {
      console.log("Auto-saving application tracker modifications...");
      saveAllPendingChanges(
        notesText,
        dossierText,
        jdText,
        appStatus,
        appNotes,
        coverLetterText,
        compCompanyType,
        compLocation,
        compContractType,
        compSalaryExpectation,
        compSalaryOffer,
        compTjmExpectation,
        compTjmOffer,
        compSalaryEstimateAiResult
      );
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    notesText, 
    dossierText, 
    jdText, 
    appNotes, 
    coverLetterText, 
    compCompanyType, 
    compLocation, 
    compContractType, 
    compSalaryExpectation, 
    compSalaryOffer, 
    compTjmExpectation, 
    compTjmOffer, 
    compSalaryEstimateAiResult
  ]);

  const updateApplication = (fields: Partial<JobApplication>) => {
    const updatedSteps = (application.interviewSteps || []).map(s => {
      if (s.id === activeStepId) {
        return { ...s, notes: notesText };
      }
      return s;
    });

    const updated = {
      ...application,
      status: appStatus,
      jobDescription: jdText,
      skillsDossierText: dossierText,
      skillsDossierFileName: fileName,
      interviewSteps: updatedSteps,
      notes: appNotes,
      coverLetterText: coverLetterText,
      companyType: compCompanyType,
      location: compLocation,
      contractType: compContractType,
      salaryExpectation: compSalaryExpectation,
      salaryOffer: compSalaryOffer,
      tjmExpectation: compTjmExpectation,
      tjmOffer: compTjmOffer,
      salaryEstimateAiResult: compSalaryEstimateAiResult,
      ...fields
    };
    onUpdate(updated);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as ApplicationStatus;
    setAppStatus(nextStatus);
    saveAllPendingChanges(notesText, dossierText, jdText, nextStatus);
  };



  // Add Step to Recruitment Timeline
  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) return;

    const newStep: InterviewStep = {
      id: Date.now().toString(),
      title: newStepTitle.trim(),
      status: 'pending',
      notes: '',
      aiPrep: ''
    };

    const currentSteps = application.interviewSteps || [];
    const updatedSteps = [...currentSteps, newStep];
    updateApplication({ interviewSteps: updatedSteps });
    setNewStepTitle('');
    setActiveStepId(newStep.id);
  };

  const handleDeleteStep = (stepId: string) => {
    const confirmMsg = isFrench ? "Supprimer cette étape d'entretien ?" : "Delete this interview step?";
    if (!window.confirm(confirmMsg)) return;

    const currentSteps = application.interviewSteps || [];
    const updatedSteps = currentSteps.filter(s => s.id !== stepId);
    updateApplication({ interviewSteps: updatedSteps });
    
    if (activeStepId === stepId) {
      setActiveStepId(updatedSteps.length > 0 ? updatedSteps[0].id : null);
    }
  };

  const handleUpdateStepField = <K extends keyof InterviewStep>(stepId: string, key: K, value: InterviewStep[K]) => {
    const currentSteps = application.interviewSteps || [];
    const updatedSteps = currentSteps.map(s => {
      if (s.id === stepId) {
        return { ...s, [key]: value };
      }
      return s;
    });

    if (key === 'notes' && stepId === activeStepId) {
      setNotesText(value as string);
    }

    const updated = {
      ...application,
      status: appStatus,
      jobDescription: jdText,
      skillsDossierText: dossierText,
      skillsDossierFileName: fileName,
      interviewSteps: updatedSteps
    };
    onUpdate(updated);
  };

  // Skills Dossier Uploader
  const handleDossierUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileName(file.name);
      setDossierText(text);
      updateApplication({
        skillsDossierFileName: file.name,
        skillsDossierText: text
      });
    };
    reader.readAsText(file);
  };

  // Query Gemini or proxy through Backend AI Gateway to generate a custom Cover Letter for this application
  const handleGenerateCoverLetter = async () => {
    setAiError('');
    setIsGeneratingLetter(true);

    try {
      const online = await apiService.checkHealth();
      const isCloudConnected = online && apiService.isLoggedIn();
      const apiKey = localStorage.getItem('gemini_api_key');
      
      if (!apiKey && !isCloudConnected) {
        throw new Error(isFrench 
          ? 'Clé API Gemini manquante. Configurez votre clé ou connectez-vous au Cloud.' 
          : 'Missing Gemini API Key. Configure a key or connect to Cloud.');
      }

      const resumeDataRaw = (application.resumeDataUsed && Object.keys(application.resumeDataUsed).length > 0) 
        ? application.resumeDataUsed 
        : activeResumeData;
      
      // Clean builder state variables (targetJobDescription, coverLetter) from CV data to prevent prompt bleeding
      const { targetJobDescription, coverLetter, ...cleanedResumeData } = resumeDataRaw || {};
      
      let letter = '';

      if (isCloudConnected) {
        // Secures calls via Backend Proxy Gateway (Uses Server Global Key or User Decrypted Key)
        const systemInstruction = isFrench
          ? "Vous êtes un coach en recrutement expert. Rédigez une lettre de motivation complète, percutante et professionnelle."
          : "You are an expert recruitment coach. Generate a complete, compelling, and professional cover letter.";
        const userPrompt = `
          Entreprise cible : "${application.companyName || 'Non spécifiée'}"
          Poste cible : "${application.roleTitle || 'Non spécifié'}"
          CV du Candidat (JSON) : ${JSON.stringify(cleanedResumeData)}
          Offre d'emploi : ${jdText || 'Non spécifiée'}
          Notes supplémentaires / Dossier de compétences : ${dossierText || 'Aucun document supplémentaire.'}

          CONSIGNES DE RÉDACTION :
          - Langue : Rédigez entièrement en ${isFrench ? 'Français' : 'Anglais'}.
          - Retournez UNIQUEMENT le texte de la lettre, formaté proprement avec des paragraphes bien espacés (structure formelle).
          - Ne mettez PAS de titre Markdown comme '# Lettre de Motivation' ou '# Cover Letter'.
          - Utilisez des placeholders classiques comme [Date], [Nom du recruteur] si nécessaire, et intégrez les détails du candidat (nom, prénom) déduits du CV.
          - Alignez la lettre sur les exigences de l'offre d'emploi tout en valorisant les meilleures réalisations du candidat issues du CV et du dossier de compétences.
        `;
        letter = await apiService.proxyLlm(systemInstruction, userPrompt, 'GEMINI');
      } else {
        // Frontend direct browser call (Fallback)
        letter = await generateCoverLetterWithGemini(
          apiKey!,
          JSON.stringify(cleanedResumeData),
          jdText || '',
          language,
          application.companyName,
          application.roleTitle,
          dossierText
        );
      }

      setCoverLetterText(letter);
      saveAllPendingChanges(notesText, dossierText, jdText, appStatus, appNotes, letter);
    } catch (err: any) {
      setAiError(err.message || 'An error occurred.');
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  // Query Gemini or proxy through Backend AI Gateway for Interview Preparation Guide
  const handleGeneratePrep = async (stepId: string, stepTitle: string) => {
    setAiError('');
    setLoadingStepId(stepId);

    try {
      const online = await apiService.checkHealth();
      const isCloudConnected = online && apiService.isLoggedIn();
      const apiKey = localStorage.getItem('gemini_api_key');
      
      if (!apiKey && !isCloudConnected) {
        throw new Error(isFrench 
          ? 'Clé API Gemini manquante. Configurez votre clé ou connectez-vous au Cloud.' 
          : 'Missing Gemini API Key. Configure a key or connect to Cloud.');
      }

      const resumeDataRaw = (application.resumeDataUsed && Object.keys(application.resumeDataUsed).length > 0) 
        ? application.resumeDataUsed 
        : activeResumeData;
      
      // Clean builder state variables (targetJobDescription, coverLetter) from CV data to prevent prompt bleeding
      const { targetJobDescription, coverLetter, ...cleanedResumeData } = resumeDataRaw || {};
      
      let prepGuide = '';

      if (isCloudConnected) {
        // Secures calls via Backend Proxy Gateway (Uses Server Global Key or User Decrypted Key)
        const systemInstruction = isFrench
          ? "Vous êtes un coach en recrutement expert. Préparez un plan d'entraînement d'entretien structuré et des conseils basés sur le CV, l'entreprise et l'offre d'emploi."
          : "You are an expert recruitment coach. Generate a structured interview prep plan and advice based on the resume, target company, and job offer.";
        const userPrompt = `
          Entreprise cible : "${application.companyName || 'Non spécifiée'}"
          Poste cible : "${application.roleTitle || 'Non spécifié'}"
          Étape d'entretien : "${stepTitle}"
          CV du Candidat (JSON) : ${JSON.stringify(cleanedResumeData)}
          Offre d'emploi : ${jdText || 'Non spécifiée'}
          Notes générales de la candidature : ${appNotes || 'Aucune note générale.'}
          Notes supplémentaires / Master Dossier : ${dossierText || 'Aucun document supplémentaire.'}

          DIRECTIVE DE PRÉPARATION ADAPTATIVE TECHNIQUE (CRITIQUE) :
          Si le titre de l'étape "${stepTitle}" ou la description de l'offre d'emploi contient des mots-clés techniques comme "technique", "coding", "quiz", "codingame", "test", "live coding", "entretien technique" ou liste des technologies (ex: Java, React, Angular, Python, SQL, Docker) :
          - Considérez cela comme une étape d'évaluation technique rigoureuse.
          - Sous la section "### Sujets techniques & Méthodes à réviser", vous DEVEZ adapter le contenu pour préparer spécifiquement le candidat à ces technologies (notions d'architectures, structures de données, bonnes pratiques de code).
          - Vous DEVEZ ajouter une sous-section explicite "#### 🧠 Exercices de Coding / Debugging Pratique" à cet endroit. Générez 1 ou 2 exercices concrets (comme des énigmes algorithmiques types Codingame, ou des snippets de code avec des bugs à corriger) avec leurs corrections optimales élégantes et explications pédagogiques claires.
        `;
        prepGuide = await apiService.proxyLlm(systemInstruction, userPrompt, 'GEMINI');
      } else {
        // Frontend direct browser call (Fallback)
        prepGuide = await generateInterviewPrepWithGemini(
          apiKey!,
          JSON.stringify(cleanedResumeData),
          jdText || '',
          stepTitle,
          dossierText,
          appNotes,
          application.companyName,
          application.roleTitle
        );
      }

      handleUpdateStepField(stepId, 'aiPrep', prepGuide);
    } catch (err: any) {
      setAiError(err.message || 'An error occurred.');
    } finally {
      setLoadingStepId(null);
    }
  };

  const handleGenerateSalaryEstimate = async () => {
    setAiError('');
    setIsEstimatingSalary(true);

    try {
      const online = await apiService.checkHealth();
      const isCloudConnected = online && apiService.isLoggedIn();
      const apiKey = localStorage.getItem('gemini_api_key');

      if (!apiKey && !isCloudConnected) {
        throw new Error(isFrench
          ? 'Clé API Gemini manquante. Configurez votre clé ou connectez-vous au Cloud.'
          : 'Missing Gemini API Key. Configure a key or connect to Cloud.');
      }

      const resumeDataRaw = (application.resumeDataUsed && Object.keys(application.resumeDataUsed).length > 0)
        ? application.resumeDataUsed
        : activeResumeData;

      // Clean builder state variables to prevent bleeding
      const { targetJobDescription, coverLetter, ...cleanedResumeData } = resumeDataRaw || {};

      let resultText = '';

      const systemInstruction = isFrench
        ? "Vous êtes un consultant expert en rémunération, recrutement et marché du travail. Votre but est d'estimer avec précision la fourchette de salaire ou de TJM d'un candidat face à une offre d'emploi et de lui donner des conseils de négociation."
        : "You are an expert compensation, recruitment, and labor market consultant. Your goal is to accurately estimate a candidate's salary or TJM range for a job offer and provide negotiation advice.";

      const detailsPrompt = `
        Entreprise : "${application.companyName}"
        Type d'entreprise : "${compCompanyType || 'Non spécifié'}"
        Localisation du poste : "${compLocation || 'Non spécifiée'}"
        Intitulé du poste : "${application.roleTitle}"
        Type de contrat envisagé : "${compContractType === 'cdi' ? 'CDI (Salarié)' : compContractType === 'freelance' ? 'Freelance (TJM)' : 'Non spécifié'}"
        Description du poste : "${jdText}"
        Attentes du candidat : ${compContractType === 'cdi' ? `${compSalaryExpectation || 0} € brut annuel` : `${compTjmExpectation || 0} €/jour TJM`}
        Proposition de l'entreprise : ${compContractType === 'cdi' ? `${compSalaryOffer || 0} € brut annuel` : `${compTjmOffer || 0} €/jour TJM`}
        CV du Candidat (JSON) : ${JSON.stringify(cleanedResumeData)}
        Dossier de compétences : ${dossierText || 'Aucun document supplémentaire.'}
        Notes générales de la candidature : ${appNotes || 'Aucune note générale.'}

        TÂCHE :
        Fournissez une analyse ultra-complète et chiffrée structurée précisément de la manière suivante :

        ### 📊 Estimation et Référence du Marché
        - Fourchette de marché estimée pour ce poste à cet endroit géographique, selon le profil du candidat (Junior, Mid, Senior, Lead).
        - Impact du type d'entreprise (${compCompanyType}) sur la grille salariale.

        ### 🔍 Positionnement du Candidat (Forces & Faiblesses)
        - Analyse de l'adéquation de ses compétences techniques, années d'expérience et dossier de compétences avec la rémunération cible.

        ### ⚖️ Comparatif & Analyse Financière
        ${compContractType === 'freelance' ? `
        - Comparaison du TJM attendu (${compTjmExpectation} €) et proposé (${compTjmOffer} €) par rapport au marché.
        - **Simulation Financière Détaillée** :
          - Chiffre d'affaires mensuel brut estimé (sur une base de 18 jours travaillés par mois).
          - Estimation des cotisations sociales et impôts sous statut de Micro-entreprise (Auto-entrepreneur) ou SASU en France.
          - Simulation alternative en Portage Salarial (salaire net estimé à environ 45-50% du chiffre d'affaires).
          - Revenu net disponible réel après toutes charges.
        ` : `
        - Comparaison du salaire attendu (${compSalaryExpectation} €) et proposé (${compSalaryOffer} €) par rapport à la grille estimée.
        - Estimation du salaire net mensuel avant impôt sur le revenu.
        `}

        ### 💡 Stratégie de Négociation & Arguments
        - Donnez 3 arguments clés concrets (STAR/faits chiffrés basés sur son CV) à avancer en entretien pour justifier les attentes salariales ou obtenir une augmentation.
        - Tactiques spécifiques pour surmonter les objections de l'entreprise.

        CONSIGNES STRICTES :
        - Écrivez entièrement en ${isFrench ? 'Français' : 'English'}.
        - Pas d'introduction polie ni de blabla inutile, démarrez directement avec les titres.
        - Donnez des estimations de marché réalistes en vous basant sur les salaires/TJM réels de la tech/marché en 2026.
      `;

      if (isCloudConnected) {
        resultText = await apiService.proxyLlm(systemInstruction, detailsPrompt, 'GEMINI');
      } else {
        resultText = await generateAtsAdviceWithGemini(
          apiKey!,
          systemInstruction,
          detailsPrompt
        );
      }

      setCompSalaryEstimateAiResult(resultText);
      saveAllPendingChanges(
        notesText,
        dossierText,
        jdText,
        appStatus,
        appNotes,
        coverLetterText,
        compCompanyType,
        compLocation,
        compContractType,
        compSalaryExpectation,
        compSalaryOffer,
        compTjmExpectation,
        compTjmOffer,
        resultText
      );
    } catch (err: any) {
      setAiError(err.message || 'An error occurred.');
    } finally {
      setIsEstimatingSalary(false);
    }
  };

  const currentSteps = application.interviewSteps || [];
  const activeStep = currentSteps.find(s => s.id === activeStepId);

  return (
    <div className="space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
      {/* Back Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm transition-colors text-xs font-semibold flex-wrap gap-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold transition cursor-pointer"
        >
          <ArrowLeft size={16} />
          {isFrench ? 'Retour' : 'Back'}
        </button>

        <div className="flex items-center gap-3">
          {saveStatus !== 'idle' && (
            <span className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold border transition-all ${
              saveStatus === 'saving'
                ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 animate-pulse'
                : saveStatus === 'saved'
                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                : 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
            }`}>
              {saveStatus === 'saving' && (isFrench ? 'Enregistrement...' : 'Saving...')}
              {saveStatus === 'saved' && (isFrench ? 'Enregistré' : 'Saved')}
              {saveStatus === 'error' && (isFrench ? 'Erreur' : 'Error')}
            </span>
          )}

          <button
            type="button"
            onClick={() => saveAllPendingChanges()}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-[11px] font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save size={13} />
            {isFrench ? 'Enregistrer' : 'Save'}
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">{isFrench ? 'Statut :' : 'Status:'}</span>
            <select 
              value={appStatus}
              onChange={handleStatusChange}
              className="p-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:ring-1 focus:ring-indigo-500 bg-white cursor-pointer text-[11px]"
            >
              <option value="draft">{isFrench ? 'Brouillon' : 'Draft'}</option>
              <option value="applied">{isFrench ? 'Candidaté' : 'Applied'}</option>
              <option value="interviewing">{isFrench ? 'Entretien' : 'Interviewing'}</option>
              <option value="offer">{isFrench ? 'Offre Reçue 🎉' : 'Offer Received 🎉'}</option>
              <option value="rejected">{isFrench ? 'Refusé' : 'Rejected'}</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowOneNotePanel(!showOneNotePanel)}
            className={`flex items-center gap-1 text-[11px] font-bold shadow-sm transition-colors cursor-pointer px-3 py-1.5 rounded ${
              showOneNotePanel 
                ? 'bg-purple-900 border border-purple-800 text-white' 
                : 'bg-[#80397b] hover:bg-[#6c3069] text-white'
            }`}
          >
            <Share2 size={13} />
            {isFrench ? 'Copier OneNote' : 'Copy OneNote'}
          </button>
        </div>
      </div>

      {/* OneNote Export Panel */}
      {showOneNotePanel && (
        <div className="bg-purple-50 dark:bg-[#2e1c2e]/30 border border-purple-200 dark:border-purple-950/80 p-4 rounded-lg shadow-sm space-y-3 animate-fade-in transition-all">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold text-[#80397b] dark:text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Share2 size={14} className="text-[#80397b] dark:text-purple-400" />
                {isFrench ? 'Export Formaté pour OneNote' : 'Formatted Export for OneNote'}
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-purple-200/60 mt-1 leading-normal">
                {isFrench 
                  ? "Copiez le titre et le contenu ci-dessous dans votre OneNote. Le contenu est copié en format enrichi (HTML) avec mise en page et couleurs préservées !" 
                  : "Copy the title and body below to your OneNote. The body is copied in rich text (HTML) format, keeping all style and colors!"}
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => setShowOneNotePanel(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-purple-300 font-bold text-xs"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Title Selector & Copy */}
            <div className="bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-950 p-3 rounded-lg flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400">
                  {isFrench ? '1. CHOISIR LE PRÉFIXE DE LA PAGE ONENOTE' : '1. CHOOSE ONENOTE PAGE PREFIX'}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(['Opportunité', 'Candidature', 'Entretien'] as const).map(pref => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setOneNotePrefix(pref)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        oneNotePrefix === pref 
                          ? 'bg-purple-100 dark:bg-purple-950 border-[#80397b] text-[#80397b] dark:text-purple-300' 
                          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOneNotePrefix('custom')}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      oneNotePrefix === 'custom' 
                        ? 'bg-purple-100 dark:bg-purple-950 border-[#80397b] text-[#80397b] dark:text-purple-300' 
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {isFrench ? 'Autre...' : 'Custom...'}
                  </button>
                </div>

                {oneNotePrefix === 'custom' && (
                  <input
                    type="text"
                    value={oneNoteCustomPrefix}
                    onChange={(e) => setOneNoteCustomPrefix(e.target.value)}
                    placeholder={isFrench ? "Ex: Offre de..." : "e.g. Offer from..."}
                    className="w-full p-1.5 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-purple-50 dark:border-purple-950/40">
                <div className="text-[10px] font-bold text-gray-400">
                  {isFrench ? 'TITRE GÉNÉRÉ :' : 'GENERATED TITLE:'}
                </div>
                <div className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-purple-50/50 dark:bg-purple-950/20 p-2 rounded border border-dashed border-purple-200 dark:border-purple-900 truncate">
                  {getOneNotePageTitle()}
                </div>
                <button
                  type="button"
                  onClick={handleCopyTitle}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#80397b] hover:bg-[#6c3069] text-white py-1.5 rounded text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {copiedTitle ? (
                    <>
                      <CheckCircle size={14} />
                      {isFrench ? 'Titre Copié !' : 'Title Copied!'}
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      {isFrench ? 'Copier le Titre' : 'Copy Title'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Content Copy Block */}
            <div className="bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-950 p-3 rounded-lg flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400">
                  {isFrench ? '2. CONTENU DU DOSSIER DE CANDIDATURE' : '2. APPLICATION DOSSIER CONTENT'}
                </label>
                <div className="text-[10px] text-gray-400 leading-relaxed">
                  {isFrench 
                    ? "Inclus la description de poste, vos notes générales, l'historique complet de vos entretiens et notes ainsi que les fiches de préparation IA !" 
                    : "Includes job description, general notes, full interview step logs and matching AI preparation coaches!"}
                </div>
                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/20 px-2 py-1.5 rounded border border-purple-100 dark:border-purple-900/40">
                  ✓ {isFrench ? 'Format enrichi compatible OneNote' : 'OneNote compatible rich formatting'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyContent}
                className="w-full flex items-center justify-center gap-2 bg-[#80397b] hover:bg-[#6c3069] text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md cursor-pointer"
              >
                {copiedContent ? (
                  <>
                    <CheckCircle size={18} />
                    {isFrench ? 'Contenu Copié ! Prêt à coller' : 'Content Copied! Ready to Paste'}
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    {isFrench ? 'Copier le Dossier Complet' : 'Copy Complete Dossier'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Info */}
      <div className="bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm space-y-2 transition-colors">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{application.companyName}</h2>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{application.roleTitle}</p>
          </div>
          <span className={`px-2.5 py-0.5 text-[10px] font-bold border rounded-full capitalize ${statusColors[appStatus]}`}>
            {appStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Left column: Timeline/Steps list & Dossier */}
        <div className="col-span-1 space-y-4">
          
          {/* Associated CV Manager */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-sm transition-colors text-xs space-y-2">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <FileText size={14} className="text-indigo-500" />
              {isFrench ? 'CV associé à la candidature' : 'Associated CV'}
            </h3>
            
            {application.resumeDataUsed && Object.keys(application.resumeDataUsed).length > 0 ? (
              <div className="p-2 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded flex flex-col gap-1">
                <div className="font-semibold text-indigo-900 dark:text-indigo-300">
                  📄 {isFrench ? 'CV spécifique sauvegardé' : 'Saved Resume Snapshot'}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  {isFrench 
                    ? `Nom : ${application.resumeDataUsed.personalInfo?.fullName || '-'} - ${application.resumeDataUsed.personalInfo?.jobTitle || '-'}`
                    : `Name: ${application.resumeDataUsed.personalInfo?.fullName || '-'} - ${application.resumeDataUsed.personalInfo?.jobTitle || '-'}`
                  }
                </div>
              </div>
            ) : (
              <div className="p-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded flex flex-col gap-1">
                <div className="font-semibold text-amber-900 dark:text-amber-300">
                  ⚠️ {isFrench ? 'Aucun CV spécifique' : 'No specific CV'}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                  {isFrench 
                    ? "Utilise par défaut le CV actif de l'éditeur. Associez un CV ci-dessous pour figer le CV utilisé."
                    : "Uses the active builder CV by default. Associate a specific version below to lock it."}
                </div>
              </div>
            )}

            {/* Selection Dropdown */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">
                {isFrench ? 'Associer un CV :' : 'Associate a CV:'}
              </label>
              
              <select
                value={application.resumeVersionId || ''}
                onChange={(e) => {
                  if (e.target.value === 'active') {
                    handleAssociateActiveCv();
                  } else if (e.target.value === '') {
                    const confirmMsg = isFrench 
                      ? "Dissocier le CV de cette candidature ?" 
                      : "Dissociate the CV from this application?";
                    if (window.confirm(confirmMsg)) {
                      updateApplication({
                        resumeDataUsed: undefined,
                        resumeVersionId: ''
                      });
                    }
                  } else {
                    handleAssociateCv(e.target.value);
                  }
                }}
                className="w-full p-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded text-[11px] cursor-pointer"
              >
                <option value="">-- {isFrench ? 'Choisir un CV...' : 'Select a CV...'} --</option>
                <option value="active">✨ {isFrench ? "CV Actuel de l'éditeur" : "Current Builder CV"}</option>
                {cvVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    💾 {v.name} ({v.updatedAt})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Recruitment timeline step creator */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-sm transition-colors text-xs">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3">{isFrench ? '🗓️ Étapes de Recrutement' : '🗓️ Recruitment Timeline'}</h3>
            
            <form onSubmit={handleAddStep} className="flex gap-1.5 mb-4">
              <input 
                type="text"
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                placeholder={isFrench ? "Ex: Entretien RH, Tech..." : "e.g. HR Interview..."}
                className="flex-1 p-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded text-[11px]"
                required
              />
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded transition cursor-pointer flex items-center justify-center"
              >
                <Plus size={14} />
              </button>
            </form>

            <div className="space-y-1.5">
              {currentSteps.length === 0 ? (
                <p className="italic text-gray-400 text-center py-4">{isFrench ? 'Aucune étape définie.' : 'No steps defined yet.'}</p>
              ) : (
                currentSteps.map(step => {
                  const isActive = step.id === activeStepId;
                  return (
                    <div
                      key={step.id}
                      onClick={() => setActiveStepId(step.id)}
                      className={`p-2 border rounded-lg cursor-pointer transition flex items-center justify-between ${isActive ? 'bg-indigo-50/50 border-indigo-300 dark:bg-indigo-950/20 dark:border-indigo-900' : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {step.status === 'completed' ? (
                          <CheckCircle size={12} className="text-green-500 shrink-0" />
                        ) : step.status === 'failed' ? (
                          <XCircle size={12} className="text-red-500 shrink-0" />
                        ) : (
                          <Clock size={12} className="text-amber-500 shrink-0" />
                        )}
                        <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">{step.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                        className="text-gray-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detailed Skills Dossier Uploader */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-sm transition-colors text-xs space-y-2">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <FileUp size={14} className="text-indigo-500" />
              {isFrench ? 'Dossier de compétences' : 'Skills Dossier'}
            </h3>
            <p className="text-[10px] text-gray-400 leading-normal">
              {isFrench 
                ? "Déposez vos notes ou documents détaillés pour que l'IA connaisse parfaitement votre background lors de la préparation."
                : "Upload your master skills document so the AI has deep, perfect context of your history."}
            </p>
            
            <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 p-3 rounded cursor-pointer transition text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
              <FileText size={14} />
              {fileName ? fileName : (isFrench ? "Uploader un fichier (.txt, .md)" : "Upload File (.txt, .md)")}
              <input type="file" accept=".txt,.md,.json" onChange={handleDossierUpload} className="hidden" />
            </label>

            {dossierText && (
              <div className="relative space-y-2">
                <div className="flex justify-end gap-1.5 text-[9px] mb-1">
                  <button
                    type="button"
                    onClick={() => setDossierMode('edit')}
                    className={`px-1.5 py-0.2 rounded border transition cursor-pointer font-bold ${dossierMode === 'edit' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    {isFrench ? '✏️ Modifier' : '✏️ Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDossierMode('preview')}
                    className={`px-1.5 py-0.2 rounded border transition cursor-pointer font-bold ${dossierMode === 'preview' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    {isFrench ? '👁️ Aperçu' : '👁️ Preview'}
                  </button>
                </div>

                {dossierMode === 'edit' ? (
                  <textarea
                    value={dossierText}
                    onChange={(e) => setDossierText(e.target.value)}
                    onBlur={() => saveAllPendingChanges(notesText, dossierText, jdText, appStatus)}
                    className="w-full h-36 p-2.5 text-[11px] bg-white border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 rounded resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                ) : (
                  <div className="w-full h-36 p-3 overflow-y-auto border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 rounded text-[10px] leading-relaxed bg-gray-50/20 pr-2">
                    <MarkdownRenderer content={dossierText} />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setDossierText(''); setFileName(''); updateApplication({ skillsDossierText: '', skillsDossierFileName: '' }); }}
                  className="absolute bottom-2 right-2 text-[10px] text-red-500 hover:text-red-700 bg-white dark:bg-gray-800 shadow-sm border border-red-100 dark:border-red-900 rounded px-1.5 py-0.5 cursor-pointer font-bold"
                >
                  {isFrench ? 'Retirer' : 'Remove'}
                </button>
              </div>
            )}
          </div>

          {/* Tailored Cover Letter Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-sm transition-colors text-xs space-y-2">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <FileText size={14} className="text-blue-500" />
                {isFrench ? 'Lettre de motivation' : 'Cover Letter'}
              </h3>
              
              <button
                type="button"
                onClick={handleGenerateCoverLetter}
                disabled={isGeneratingLetter}
                className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 px-2 py-1 rounded-full font-bold text-[9px] transition cursor-pointer disabled:opacity-50"
              >
                {isGeneratingLetter ? (
                  <><Loader2 size={10} className="animate-spin" /> {isFrench ? 'Génération...' : 'Generating...'}</>
                ) : (
                  <><Sparkles size={10} /> {isFrench ? 'Générer avec IA' : 'Generate with AI'}</>
                )}
              </button>
            </div>
            
            <p className="text-[10px] text-gray-400 leading-normal">
              {isFrench 
                ? "Créez une lettre de motivation ciblée et impactante en accord avec votre profil de CV et cette offre."
                : "Create a targeted cover letter optimized with your CV profile and this job description."}
            </p>

            <div className="relative space-y-2">
              <div className="flex justify-end gap-1.5 text-[9px] mb-1">
                <button
                  type="button"
                  onClick={() => setCoverLetterMode('edit')}
                  className={`px-1.5 py-0.2 rounded border transition cursor-pointer font-bold ${coverLetterMode === 'edit' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {isFrench ? '✏️ Modifier' : '✏️ Edit'}
                </button>
                <button
                  type="button"
                  onClick={() => setCoverLetterMode('preview')}
                  className={`px-1.5 py-0.2 rounded border transition cursor-pointer font-bold ${coverLetterMode === 'preview' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {isFrench ? '👁️ Aperçu' : '👁️ Preview'}
                </button>
              </div>

              {coverLetterMode === 'edit' ? (
                <textarea
                  value={coverLetterText}
                  onChange={(e) => setCoverLetterText(e.target.value)}
                  onBlur={() => saveAllPendingChanges(notesText, dossierText, jdText, appStatus, appNotes, coverLetterText)}
                  className="w-full h-44 p-2.5 text-[11px] bg-white border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 rounded resize-none focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder={isFrench 
                    ? "Rédigez votre lettre ou cliquez sur 'Générer avec IA'..." 
                    : "Write your cover letter or click 'Generate with AI'..."
                  }
                />
              ) : (
                <div className="w-full h-44 p-3 overflow-y-auto border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 rounded text-[11px] leading-relaxed bg-gray-50/20 pr-2">
                  {coverLetterText ? (
                    <MarkdownRenderer content={coverLetterText} />
                  ) : (
                    <span className="text-gray-400 italic">
                      {isFrench ? 'Aucune lettre de motivation rédigée.' : 'No cover letter written.'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle and Right: Step Notes & AI Prep Guide */}
        <div className="col-span-2 space-y-4">
          {activeStep ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm transition-colors text-xs space-y-4">
              
              {/* Active Step Details */}
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <Calendar size={15} />
                  {isFrench ? `Étape : ${activeStep.title}` : `Step: ${activeStep.title}`}
                </h3>
                
                {/* Step Status Controls */}
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{isFrench ? 'Statut :' : 'Status:'}</span>
                  <select
                    value={activeStep.status}
                    onChange={(e) => handleUpdateStepField(activeStep.id, 'status', e.target.value as any)}
                    className="p-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded bg-white text-[11px] cursor-pointer"
                  >
                    <option value="pending">{isFrench ? 'À venir' : 'Pending'}</option>
                    <option value="completed">{isFrench ? 'Complété' : 'Completed'}</option>
                    <option value="failed">{isFrench ? 'Échoué' : 'Failed'}</option>
                  </select>
                </div>
              </div>

              {/* Formatted Notes Markdown Area */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-gray-700 dark:text-gray-300">{isFrench ? '📝 Notes de l\'entretien' : '📝 Interview Notes'}</label>
                  <div className="flex gap-1.5 text-[9px]">
                    <button
                      type="button"
                      onClick={() => setNotesMode('edit')}
                      className={`px-1.5 py-0.2 rounded border transition cursor-pointer font-bold ${notesMode === 'edit' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      {isFrench ? '✏️ Saisie' : '✏️ Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotesMode('preview')}
                      className={`px-1.5 py-0.2 rounded border transition cursor-pointer font-bold ${notesMode === 'preview' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      {isFrench ? '👁️ Aperçu' : '👁️ Preview'}
                    </button>
                  </div>
                </div>

                {notesMode === 'edit' ? (
                  <textarea 
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    onBlur={() => saveAllPendingChanges(notesText, dossierText, jdText, appStatus)}
                    className="w-full h-32 p-3 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans resize-none transition-colors"
                    placeholder={isFrench ? "- Vos questions prévues...\n- Réponses du recruteur...\n- Salaire évoqué : 65k...\n- Feedback : positif" : "- Questions to prepare...\n- Interviewer answers...\n- Budget discuss: 65k...\n- Feedback: Positive"}
                  />
                ) : (
                  <div className="w-full h-32 p-3 overflow-y-auto border border-gray-200 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 rounded text-xs leading-relaxed bg-gray-50/20 pr-2">
                    {notesText ? <MarkdownRenderer content={notesText} /> : <span className="text-gray-400 italic">{isFrench ? 'Aucune note rédigée.' : 'No notes written.'}</span>}
                  </div>
                )}
              </div>

              {/* AI Preparation block */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-500" />
                    {isFrench ? '✨ Assistant IA de Préparation' : '✨ AI Interview Coach'}
                  </h4>
                  
                  <button
                    type="button"
                    onClick={() => handleGeneratePrep(activeStep.id, activeStep.title)}
                    disabled={loadingStepId !== null}
                    className="flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 px-3 py-1.5 rounded-full font-bold text-[10px] transition cursor-pointer disabled:opacity-50"
                  >
                    {loadingStepId === activeStep.id ? (
                      <><Loader2 size={12} className="animate-spin" /> {isFrench ? 'Analyse...' : 'Analyzing...'}</>
                    ) : (
                      <><Sparkles size={12} /> {isFrench ? 'Générer l\'entraînement IA' : 'Generate AI Prep'}</>
                    )}
                  </button>
                </div>

                {aiError && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 rounded">{aiError}</div>
                )}

                {activeStep.aiPrep ? (
                  <div className="bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/40 rounded-lg p-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin shadow-inner">
                    <MarkdownRenderer content={activeStep.aiPrep} />
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50/30 rounded border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 italic text-[10px]">
                    {isFrench 
                      ? "Cliquez sur le bouton ci-dessus pour générer des questions typiques, des réponses sur-mesure et des sujets techniques basés sur votre CV."
                      : "Click the button above to generate standard questions, tailored responses, and technical sheets based on your resume."}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-lg shadow-sm text-center text-gray-400 italic transition-colors">
              {isFrench 
                ? "Sélectionnez ou créez une étape de recrutement dans la timeline pour commencer à préparer votre entretien."
                : "Select or add an interview step in the timeline to begin preparing."}
            </div>
          )}

          {/* Compensation Simulator & AI Estimator */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm transition-colors text-xs space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <Share2 size={15} className="text-indigo-500" />
                {isFrench ? '💰 Simulateur & Estimateur Salarial IA' : '💰 Salary & AI TJM Simulator'}
              </h3>
              
              <button
                type="button"
                onClick={handleGenerateSalaryEstimate}
                disabled={isEstimatingSalary || !compContractType}
                className="flex items-center gap-1 bg-indigo-600 text-white dark:bg-indigo-500 hover:opacity-90 px-3 py-1.5 rounded-full font-bold text-[10px] transition cursor-pointer disabled:opacity-50 disabled:bg-gray-200 dark:disabled:bg-gray-850 dark:disabled:text-gray-500"
              >
                {isEstimatingSalary ? (
                  <><Loader2 size={12} className="animate-spin" /> {isFrench ? 'Analyse...' : 'Analyzing...'}</>
                ) : (
                  <><Sparkles size={12} /> {isFrench ? "Estimer avec l'IA" : 'Estimate with AI'}</>
                )}
              </button>
            </div>

            {/* Inputs Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  {isFrench ? 'TYPE DE CONTRAT' : 'CONTRACT TYPE'}
                </label>
                <select
                  value={compContractType}
                  onChange={(e) => setCompContractType(e.target.value as any)}
                  className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-indigo-500 transition-colors"
                >
                  <option value="">-- {isFrench ? 'Sélectionner' : 'Select'} --</option>
                  <option value="cdi">CDI</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  {isFrench ? "TYPE D'ENTREPRISE" : 'COMPANY TYPE'}
                </label>
                <select
                  value={compCompanyType}
                  onChange={(e) => setCompCompanyType(e.target.value as any)}
                  className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-indigo-500 transition-colors"
                >
                  <option value="">-- {isFrench ? 'Sélectionner' : 'Select'} --</option>
                  <option value="startup">Startup</option>
                  <option value="scaleup">Scaleup</option>
                  <option value="pme">PME</option>
                  <option value="esn">ESN / ESN Digitale</option>
                  <option value="grand_groupe">Grand Groupe</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  {isFrench ? 'LOCALISATION DU POSTE' : 'JOB LOCATION'}
                </label>
                <input
                  type="text"
                  value={compLocation}
                  onChange={(e) => setCompLocation(e.target.value)}
                  placeholder={isFrench ? 'ex: Paris, Remote...' : 'e.g. London, Remote...'}
                  className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {compContractType === 'cdi' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-950/40 rounded-lg border border-gray-150 dark:border-gray-850 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                    {isFrench ? 'MES ATTENTES (ANNUEL BRUT €)' : 'MY EXPECTATIONS (ANNUAL GROSS €)'}
                  </label>
                  <input
                    type="number"
                    value={compSalaryExpectation || ''}
                    onChange={(e) => setCompSalaryExpectation(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="ex: 55000"
                    className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                    {isFrench ? "PROPOSITION DE L'ENTREPRISE (ANNUEL BRUT €)" : 'COMPANY OFFER (ANNUAL GROSS €)'}
                  </label>
                  <input
                    type="number"
                    value={compSalaryOffer || ''}
                    onChange={(e) => setCompSalaryOffer(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="ex: 52000"
                    className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {compContractType === 'freelance' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-950/40 rounded-lg border border-gray-150 dark:border-gray-850 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                    {isFrench ? 'MON TJM SOUHAITÉ (€/JOUR)' : 'MY DESIRED TJM (€/DAY)'}
                  </label>
                  <input
                    type="number"
                    value={compTjmExpectation || ''}
                    onChange={(e) => setCompTjmExpectation(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="ex: 600"
                    className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                    {isFrench ? "PROPOSITION DE TJM DE L'ENTREPRISE (€/JOUR)" : 'COMPANY TJM OFFER (€/DAY)'}
                  </label>
                  <input
                    type="number"
                    value={compTjmOffer || ''}
                    onChange={(e) => setCompTjmOffer(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="ex: 550"
                    className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* AI Estimation Result Panel */}
            {compContractType ? (
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-855">
                <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-500" />
                  {isFrench ? '🔮 Analyse Comparative & Estimation IA' : '🔮 AI Comparative Analysis & Valuation'}
                </h4>

                {compSalaryEstimateAiResult ? (
                  <div className="bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/40 rounded-lg p-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin transition-colors">
                    <MarkdownRenderer content={compSalaryEstimateAiResult} />
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50/30 rounded border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 italic text-[10px]">
                    {isFrench 
                      ? "Renseignez vos attentes, le type d'entreprise et cliquez sur 'Estimer avec l'IA' pour générer une simulation de charges, un comparatif marché et des arguments de négociation personnalisés !"
                      : "Fill in your expectations, the company type, and click 'Estimate with AI' to generate a full market audit, net income simulator, and custom negotiation arguments!"}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50/30 rounded border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 italic text-[10px]">
                {isFrench 
                  ? "Veuillez sélectionner un type de contrat (CDI ou Freelance) pour commencer la simulation."
                  : "Please select a contract type (CDI or Freelance) to start the simulation."}
              </div>
            )}
          </div>

          {/* Job Description editor/viewer */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm transition-colors text-xs space-y-2">
            <h3 className="font-bold text-gray-700 dark:text-gray-300">{isFrench ? '📋 Description de Poste' : '📋 Job Offer details'}</h3>
            <textarea 
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              onBlur={() => saveAllPendingChanges(notesText, dossierText, jdText, appStatus)}
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 rounded resize-none transition-colors"
            />
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => saveAllPendingChanges(notesText, dossierText, jdText, appStatus)}
                className="flex items-center gap-1.5 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950 px-4 py-1.5 rounded text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                <Save size={13} />
                {isFrench ? 'Mettre à jour' : 'Update JD'}
              </button>
            </div>
          </div>

          {/* General Application Notes */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm transition-colors text-xs space-y-2">
            <h3 className="font-bold text-gray-700 dark:text-gray-300">{isFrench ? '📝 Notes Générales de la Candidature' : '📝 General Application Notes'}</h3>
            <textarea 
              value={appNotes}
              onChange={(e) => setAppNotes(e.target.value)}
              onBlur={(e) => saveAllPendingChanges(notesText, dossierText, jdText, appStatus, e.target.value)}
              placeholder={isFrench 
                ? "Saisissez des notes sur l'entreprise, contact RH, salaire, culture, questions clés..."
                : "Enter notes on company research, HR contact details, discussed salary, fit questions..."
              }
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 rounded resize-none transition-colors"
            />
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => saveAllPendingChanges(notesText, dossierText, jdText, appStatus, appNotes)}
                className="flex items-center gap-1.5 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950 px-4 py-1.5 rounded text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                <Save size={13} />
                {isFrench ? 'Mettre à jour' : 'Update Notes'}
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
