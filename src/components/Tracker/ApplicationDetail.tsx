import React, { useState } from 'react';
import type { JobApplication, InterviewStep, ApplicationStatus } from '../../types/tracker';
import { generateInterviewPrepWithGemini } from '../../utils/geminiApiService';
import { ArrowLeft, Plus, Trash2, Sparkles, Loader2, Calendar, FileText, CheckCircle, Clock, XCircle, Save, FileUp } from 'lucide-react';

interface Props {
  application: JobApplication;
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

export default function ApplicationDetail({ application, onBack, onUpdate, language }: Props) {
  const [appStatus, setAppStatus] = useState<ApplicationStatus>(application.status);
  const [jdText, setJdText] = useState(application.jobDescription);
  
  // Timeline Step States
  const [activeStepId, setActiveStepId] = useState<string | null>(
    application.interviewSteps.length > 0 ? application.interviewSteps[0].id : null
  );
  const [newStepTitle, setNewStepTitle] = useState('');
  
  // AI Prep States
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const [aiError, setAiError] = useState('');

  // Skills Dossier File State
  const [fileName, setFileName] = useState(application.skillsDossierFileName || '');
  const [dossierText, setDossierText] = useState(application.skillsDossierText || '');

  const isFrench = language === 'fr';

  const updateApplication = (fields: Partial<JobApplication>) => {
    const updated = {
      ...application,
      ...fields
    };
    onUpdate(updated);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as ApplicationStatus;
    setAppStatus(nextStatus);
    updateApplication({ status: nextStatus });
  };

  const handleJdUpdate = () => {
    updateApplication({ jobDescription: jdText });
    alert(isFrench ? "Description mise à jour !" : "Job description updated!");
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

    const updatedSteps = [...application.interviewSteps, newStep];
    updateApplication({ interviewSteps: updatedSteps });
    setNewStepTitle('');
    setActiveStepId(newStep.id);
  };

  const handleDeleteStep = (stepId: string) => {
    const confirmMsg = isFrench ? "Supprimer cette étape d'entretien ?" : "Delete this interview step?";
    if (!window.confirm(confirmMsg)) return;

    const updatedSteps = application.interviewSteps.filter(s => s.id !== stepId);
    updateApplication({ interviewSteps: updatedSteps });
    
    if (activeStepId === stepId) {
      setActiveStepId(updatedSteps.length > 0 ? updatedSteps[0].id : null);
    }
  };

  const handleUpdateStepField = <K extends keyof InterviewStep>(stepId: string, key: K, value: InterviewStep[K]) => {
    const updatedSteps = application.interviewSteps.map(s => {
      if (s.id === stepId) {
        return { ...s, [key]: value };
      }
      return s;
    });
    updateApplication({ interviewSteps: updatedSteps });
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

  // Query Gemini for Interview Preparation Guide
  const handleGeneratePrep = async (stepId: string, stepTitle: string) => {
    setAiError('');
    setLoadingStepId(stepId);

    try {
      const apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) throw new Error(isFrench ? 'Clé API Gemini manquante. Allez dans les paramètres.' : 'Missing Gemini API Key. Go to Settings.');

      const resumeData = application.resumeDataUsed || application.resumeDataUsed || {};
      
      const prepGuide = await generateInterviewPrepWithGemini(
        apiKey,
        JSON.stringify(resumeData),
        application.jobDescription || jdText,
        stepTitle,
        dossierText
      );

      handleUpdateStepField(stepId, 'aiPrep', prepGuide);
    } catch (err: any) {
      setAiError(err.message || 'An error occurred.');
    } finally {
      setLoadingStepId(null);
    }
  };

  const activeStep = application.interviewSteps.find(s => s.id === activeStepId);

  return (
    <div className="space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
      {/* Back Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm transition-colors text-xs font-semibold">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold transition cursor-pointer"
        >
          <ArrowLeft size={16} />
          {isFrench ? 'Retour aux candidatures' : 'Back to Tracker'}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-gray-500">{isFrench ? 'Statut :' : 'Status:'}</span>
          <select 
            value={appStatus}
            onChange={handleStatusChange}
            className="p-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
          >
            <option value="draft">{isFrench ? 'Brouillon' : 'Draft'}</option>
            <option value="applied">{isFrench ? 'Candidaté' : 'Applied'}</option>
            <option value="interviewing">{isFrench ? 'Entretien' : 'Interviewing'}</option>
            <option value="offer">{isFrench ? 'Offre Reçue 🎉' : 'Offer Received 🎉'}</option>
            <option value="rejected">{isFrench ? 'Refusé' : 'Rejected'}</option>
          </select>
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded transition cursor-pointer"
              >
                <Plus size={14} />
              </button>
            </form>

            <div className="space-y-1.5">
              {application.interviewSteps.length === 0 ? (
                <p className="italic text-gray-400 text-center py-4">{isFrench ? 'Aucune étape définie.' : 'No steps defined yet.'}</p>
              ) : (
                application.interviewSteps.map(step => {
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
                        onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                        className="text-gray-400 hover:text-red-500 p-0.5 rounded"
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
              <div className="relative">
                <textarea
                  value={dossierText}
                  onChange={(e) => { setDossierText(e.target.value); updateApplication({ skillsDossierText: e.target.value }); }}
                  className="w-full h-24 p-1.5 text-[10px] border border-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 rounded resize-none"
                />
                <button
                  onClick={() => { setDossierText(''); setFileName(''); updateApplication({ skillsDossierText: '', skillsDossierFileName: '' }); }}
                  className="absolute bottom-2 right-2 text-xs text-red-500 hover:text-red-700 bg-white dark:bg-gray-800 shadow-sm border border-red-100 dark:border-red-900 rounded px-1"
                >
                  {isFrench ? 'Retirer' : 'Remove'}
                </button>
              </div>
            )}
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
                    className="p-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded bg-white text-[11px]"
                  >
                    <option value="pending">{isFrench ? 'À venir' : 'Pending'}</option>
                    <option value="completed">{isFrench ? 'Complété' : 'Completed'}</option>
                    <option value="failed">{isFrench ? 'Échoué' : 'Failed'}</option>
                  </select>
                </div>
              </div>

              {/* Formatted Notes Markdown Area */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-gray-700 dark:text-gray-300">{isFrench ? '📝 Notes de l\'entretien' : '📝 Interview Notes'}</label>
                  <span className="text-[10px] text-gray-400 italic">Supports Markdown</span>
                </div>
                <textarea 
                  value={activeStep.notes || ''}
                  onChange={(e) => handleUpdateStepField(activeStep.id, 'notes', e.target.value)}
                  className="w-full h-32 p-3 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans resize-none transition-colors"
                  placeholder={isFrench ? "- Vos questions prévues...\n- Réponses du recruteur...\n- Salaire évoqué : 65k...\n- Feedback : positif" : "- Questions to prepare...\n- Interviewer answers...\n- Budget discuss: 65k...\n- Feedback: Positive"}
                />
              </div>

              {/* AI Preparation block */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-500" />
                    {isFrench ? '✨ Assistant IA de Préparation' : '✨ AI Interview Coach'}
                  </h4>
                  
                  <button
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
                  <div className="bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/40 rounded-lg p-3 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                    <div className="text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line font-sans">
                      {activeStep.aiPrep}
                    </div>
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
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 rounded resize-none transition-colors"
            />
            <div className="flex justify-end">
              <button 
                onClick={handleJdUpdate}
                className="flex items-center gap-1.5 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950 px-4 py-1.5 rounded text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                <Save size={13} />
                {isFrench ? 'Mettre à jour' : 'Update JD'}
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
