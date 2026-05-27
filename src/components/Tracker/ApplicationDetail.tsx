import React, { useState, useEffect } from 'react';
import type { JobApplication, InterviewStep, ApplicationStatus } from '../../types/tracker';
import type { ResumeData } from '../../types/resume';
import { generateInterviewPrepWithGemini, generateCoverLetterWithGemini } from '../../utils/geminiApiService';
import { apiService } from '../../utils/apiService';
import { ArrowLeft, Plus, Trash2, Sparkles, Loader2, Calendar, FileText, CheckCircle, Clock, XCircle, Save, FileUp } from 'lucide-react';
import MarkdownRenderer from '../Common/MarkdownRenderer';

interface Props {
  application: JobApplication;
  activeResumeData: ResumeData;
  onBack: () => void;
  onUpdate: (app: JobApplication) => void;
  language: 'en' | 'fr';
}

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

  // Sync state if application changes
  useEffect(() => {
    setAppNotes(application.notes || '');
    setJdText(application.jobDescription);
    setDossierText(application.skillsDossierText || '');
    setFileName(application.skillsDossierFileName || '');
    setAppStatus(application.status);
    setCoverLetterText(application.coverLetterText || '');

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
    nextCoverLetter = coverLetterText
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
        coverLetterText: nextCoverLetter
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

    if (!hasNotesChanged && !hasDossierChanged && !hasJdChanged && !hasAppNotesChanged && !hasCoverLetterChanged) return;

    const timer = setTimeout(() => {
      console.log("Auto-saving application tracker modifications...");
      saveAllPendingChanges(notesText, dossierText, jdText, appStatus, appNotes, coverLetterText);
    }, 1500);

    return () => clearTimeout(timer);
  }, [notesText, dossierText, jdText, appNotes, coverLetterText]);

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
        </div>
      </div>

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
                  <div className="w-full h-32 p-3 overflow-y-auto border border-gray-200 dark:border-gray-800 dark:bg-gray-955 dark:text-gray-300 rounded text-xs leading-relaxed bg-gray-50/20 pr-2">
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
