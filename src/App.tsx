import React, { useState, useMemo, useEffect, useRef } from 'react';
import { initialResumeState, type ResumeData } from './types/resume';
import ResumeForm from './components/Form/ResumeForm';
import PDFTemplate from './components/Preview/PDFTemplate';
import CoverLetterPDFTemplate from './components/Preview/CoverLetterPDFTemplate';
import StyleControls from './components/Preview/StyleControls';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import ImportModal from './components/Form/ImportModal';
import { getTranslation } from './i18n/translations';
import SettingsModal from './components/Form/SettingsModal';
import OptimizationDashboard from './components/Preview/OptimizationDashboard';
import { analyzeResumeMatch } from './utils/atsOptimizer';
import { translateResumeWithGemini } from './utils/geminiApiService';
import { compressImage } from './utils/imageCompressor';
import { Settings, Languages, Loader2, Sun, Moon, Briefcase, FileText as FileIcon } from 'lucide-react';
import ApplicationTracker from './components/Tracker/ApplicationTracker';
import ApplicationDetail from './components/Tracker/ApplicationDetail';
import type { JobApplication } from './types/tracker';
import { apiService } from './utils/apiService';

// Heuristic to extract target company from Job Description
export const extractTargetCompany = (jdText: string): string => {
  if (!jdText) return '';
  const lines = jdText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  const prefixRegex = /^(company|entreprise|société|employeur|client)\s*:\s*(.+)$/i;
  for (const line of lines.slice(0, 8)) {
    const match = line.match(prefixRegex);
    if (match && match[2]) {
      return match[2].trim();
    }
  }

  // Fallback: look for "at [Company]" or "chez [Company]"
  const atRegex = /\b(at|chez)\s+([A-Z][a-zA-Z0-9_\s\-]{1,20})\b/;
  const match = jdText.match(atRegex);
  if (match && match[2]) {
    const company = match[2].trim();
    const commonWords = ['la', 'le', 'une', 'un', 'des', 'les', 'this', 'the', 'my', 'our', 'new'];
    if (!commonWords.includes(company.toLowerCase())) {
      return company;
    }
  }

  return '';
};

function App() {
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeState);
  const [debouncedResumeData, setDebouncedResumeData] = useState<ResumeData>(initialResumeState);
  const [activeVersion, setActiveVersion] = useState<{ id: string; name: string; isLocked?: boolean } | null>(null);
  const [cvSaveStatus, setCvSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSavedDataRef = useRef<string>('');
  const lastActiveVersionIdRef = useRef<string>('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [showImportOpen, setShowImportOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [aiKeywords, setAiKeywords] = useState<string[]>([]); // New state for AI keywords
  const [previewTab, setPreviewTab] = useState<'cv' | 'cl'>('cv');
  const [appMode, setAppMode] = useState<'cv' | 'tracker'>('cv');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Load the latest resume version on mount (either from Postgres cloud DB or local localStorage fallback)
  useEffect(() => {
    const initializeData = async () => {
      const defaultVersionId = localStorage.getItem('ats_default_cv_version_id');

      // 1. Try to load from Spring Boot Backend Cloud if online and logged in
      try {
        const online = await apiService.checkHealth();
        if (online && apiService.isLoggedIn()) {
          const cloudVersions = await apiService.fetchVersions();
          if (cloudVersions.length > 0) {
            let matchedVersion = cloudVersions[0];
            if (defaultVersionId) {
              const found = cloudVersions.find(v => v.id === defaultVersionId);
              if (found) {
                matchedVersion = found;
                console.log("Loading default resume version from cloud DB on mount...");
              }
            }
            setResumeData(matchedVersion.data);
            setDebouncedResumeData(matchedVersion.data);
            lastSavedDataRef.current = JSON.stringify(matchedVersion.data);
            lastActiveVersionIdRef.current = matchedVersion.id;
            setActiveVersion({ id: matchedVersion.id, name: matchedVersion.name, isLocked: matchedVersion.isLocked });
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to load cloud CV data on mount, attempting local storage check", err);
      }

      // 2. Fallback: Load the default or latest version from local localStorage history if present
      try {
        const localHistoryStr = localStorage.getItem('ats_resumes_history');
        if (localHistoryStr) {
          const localHistory = JSON.parse(localHistoryStr) as any[];
          if (localHistory.length > 0) {
            let matchedVersion = localHistory[0];
            if (defaultVersionId) {
              const found = localHistory.find(v => v.id === defaultVersionId);
              if (found) {
                matchedVersion = found;
                console.log("Loading default resume version from localStorage history on mount...");
              }
            }
            setResumeData(matchedVersion.data);
            setDebouncedResumeData(matchedVersion.data);
            lastSavedDataRef.current = JSON.stringify(matchedVersion.data);
            lastActiveVersionIdRef.current = matchedVersion.id;
            setActiveVersion({ id: matchedVersion.id, name: matchedVersion.name, isLocked: matchedVersion.isLocked });
            return;
          }
        }
      } catch (err) {
        console.error("Failed to parse local resume history on mount", err);
      }

      // Default fallback
      lastSavedDataRef.current = JSON.stringify(initialResumeState);
      lastActiveVersionIdRef.current = 'initial';
      setActiveVersion({ id: 'initial', name: resumeData.language === 'fr' ? 'Version Initiale' : 'Initial Version', isLocked: false });
    };
    initializeData();
  }, []);

  // Auto-save CV to active version
  useEffect(() => {
    if (!activeVersion) return;
    
    // Check if the data is actually different from initialResumeState before writing
    if (JSON.stringify(debouncedResumeData) === JSON.stringify(initialResumeState)) return;

    // If activeVersion ID changed, it means we loaded a new version or branched.
    // Update refs and skip auto-save to prevent double saves/branching.
    if (activeVersion.id !== lastActiveVersionIdRef.current) {
      lastActiveVersionIdRef.current = activeVersion.id;
      lastSavedDataRef.current = JSON.stringify(debouncedResumeData);
      return;
    }

    // If data hasn't changed since last save/load, do nothing
    if (JSON.stringify(debouncedResumeData) === lastSavedDataRef.current) return;

    const saveActive = async () => {
      setCvSaveStatus('saving');

      // If version is locked, save active as a new unlocked version instead of overwriting!
      if (activeVersion.isLocked) {
        const nextId = Date.now().toString();
        const companyName = extractTargetCompany(resumeData.targetJobDescription || '');
        const suffix = companyName || (resumeData.language === 'fr' ? 'Personnalisé' : 'Custom');
        const nextName = `${activeVersion.name} (${suffix})`;
        
        try {
          const online = await apiService.checkHealth();
          if (online && apiService.isLoggedIn()) {
            const saved = await apiService.saveVersion(nextName, debouncedResumeData);
            lastActiveVersionIdRef.current = saved.id;
            lastSavedDataRef.current = JSON.stringify(debouncedResumeData);
            setActiveVersion({ id: saved.id, name: saved.name, isLocked: false });
            setCvSaveStatus('saved');
          } else {
            const stored = localStorage.getItem('ats_resumes_history');
            const history = stored ? JSON.parse(stored) as any[] : [];
            
            const newVersion = {
              id: nextId,
              name: nextName,
              updatedAt: new Date().toLocaleDateString(resumeData.language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
              data: debouncedResumeData,
              isLocked: false
            };
            
            const updated = [newVersion, ...history];
            localStorage.setItem('ats_resumes_history', JSON.stringify(updated));
            lastActiveVersionIdRef.current = nextId;
            lastSavedDataRef.current = JSON.stringify(debouncedResumeData);
            setActiveVersion({ id: nextId, name: nextName, isLocked: false });
            setCvSaveStatus('saved');
            // Force a reload of versions list in VersionManager component
            window.dispatchEvent(new Event('ats_resumes_history_changed'));
          }
        } catch (err) {
          console.error("Auto-branch save failed", err);
          setCvSaveStatus('error');
        }
        setTimeout(() => setCvSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000);
        return;
      }

      try {
        const online = await apiService.checkHealth();
        if (online && apiService.isLoggedIn()) {
          await apiService.saveVersion(activeVersion.name, debouncedResumeData);
          lastSavedDataRef.current = JSON.stringify(debouncedResumeData);
          setCvSaveStatus('saved');
        } else {
          // Local storage overwrite
          const stored = localStorage.getItem('ats_resumes_history');
          if (stored) {
            const history = JSON.parse(stored) as any[];
            const updated = history.map((v: any) => {
              if (v.id === activeVersion.id) {
                return { 
                  ...v, 
                  data: debouncedResumeData,
                  updatedAt: new Date().toLocaleDateString(resumeData.language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                };
              }
              return v;
            });
            localStorage.setItem('ats_resumes_history', JSON.stringify(updated));
            lastSavedDataRef.current = JSON.stringify(debouncedResumeData);
            setCvSaveStatus('saved');
          }
        }
      } catch (err) {
        console.error("Auto-save failed", err);
        setCvSaveStatus('error');
      }
      setTimeout(() => setCvSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000);
    };

    saveActive();
  }, [debouncedResumeData, activeVersion]);

  // Debounce resumeData changes for heavy PDF generation to prevent input lag
  useEffect(() => {
    setIsGeneratingPreview(true);
    const timer = setTimeout(() => {
      setDebouncedResumeData(resumeData);
      setIsGeneratingPreview(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resumeData]);

  const atsResult = useMemo(() => analyzeResumeMatch(resumeData, aiKeywords), [resumeData, aiKeywords]);

  const memoizedPdfDocument = useMemo(() => {
    return previewTab === 'cv' 
      ? <PDFTemplate data={debouncedResumeData} template={debouncedResumeData.styleSettings?.template || 'classic'} /> 
      : <CoverLetterPDFTemplate data={debouncedResumeData} />;
  }, [debouncedResumeData, previewTab]);

  const handleImport = async (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && parsed.personalInfo) {
        // Automatically compress photoUrl if it's a large Base64 string in the imported JSON CV
        let photoUrl = parsed.personalInfo.photoUrl;
        if (photoUrl && photoUrl.startsWith('data:image/') && photoUrl.length > 70000) {
          try {
            console.log("Compressing large base64 photoUrl from imported JSON CV...");
            photoUrl = await compressImage(photoUrl);
          } catch (err) {
            console.error("Failed to compress imported photoUrl:", err);
          }
        }

        setResumeData({
          ...resumeData,
          ...parsed,
          personalInfo: {
            ...parsed.personalInfo,
            photoUrl: photoUrl
          },
          language: resumeData.language
        });
        return;
      }
    } catch (e) {
      // Not JSON, fallback to existing naive heuristic
    }

    // MVP Heuristic: Extract first line as Name, look for emails, and set rest as summary.
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    
    let fullName = lines[0] || resumeData.personalInfo.fullName;
    let email = resumeData.personalInfo.email;
    let summaryParts = [];
    
    // Simple email regex test
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (let i = 1; i < lines.length; i++) {
        if (emailRegex.test(lines[i])) {
            email = lines[i];
        } else {
            summaryParts.push(lines[i]);
        }
    }

    setResumeData({
      ...resumeData,
      personalInfo: { ...resumeData.personalInfo, fullName, email },
      summary: summaryParts.join('\n') || resumeData.summary
    });
  };

  const handleExport = () => {
    // Remove the targetJobDescription from export to keep it strictly resume content
    const { targetJobDescription, ...exportData } = resumeData;
    const dataStr = encodeURIComponent(JSON.stringify(exportData, null, 2));
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + dataStr;
    a.download = 'resume_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const t = getTranslation(resumeData.language).app;

  const handleTranslate = async (targetLang: 'en' | 'fr') => {
    const online = await apiService.checkHealth();
    const isCloudConnected = online && apiService.isLoggedIn();
    const apiKey = localStorage.getItem('gemini_api_key');

    if (!apiKey && !isCloudConnected) {
      alert(t.translationError);
      setShowSettings(true);
      return;
    }

    setIsTranslating(true);
    try {
      const { targetJobDescription, ...dataToTranslate } = resumeData;
      let translatedJson = '';

      if (isCloudConnected) {
        // Secure call proxied through AI Gateway
        const systemInstruction = `You are a professional resume translation assistant. Translate the following CV JSON structure into ${targetLang === 'en' ? 'English' : 'French'}. Preserve all JSON keys exactly and output ONLY valid JSON without any wrapper markdown.`;
        const userPrompt = JSON.stringify(dataToTranslate);
        
        translatedJson = await apiService.proxyLlm(systemInstruction, userPrompt, 'GEMINI');
        // Clean potential wrapper tags from AI response
        if (translatedJson.startsWith('```')) {
          translatedJson = translatedJson.replace(/^```json\n?|```$/g, '').trim();
        }
      } else {
        translatedJson = await translateResumeWithGemini(apiKey!, JSON.stringify(dataToTranslate), targetLang);
      }
      
      const parsedData = JSON.parse(translatedJson);
      
      setResumeData({
        ...resumeData,
        ...parsedData,
        targetJobDescription: resumeData.targetJobDescription,
        language: targetLang,
      });
    } catch (e) {
      alert(t.translationError);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        handleImport(text);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input to allow re-upload 
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 font-sans overflow-hidden transition-colors duration-200">
      {/* Sidebar / Form Area */}
      <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
        <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-900 text-white shadow-md z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-wide hidden lg:block">{t.title}</h1>
            <div className="flex bg-gray-800 p-0.5 rounded border border-gray-700">
              <button 
                onClick={() => setAppMode('cv')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium ${appMode === 'cv' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white'}`}
                title={resumeData.language === 'fr' ? 'Rédacteur de CV' : 'Resume Editor'}
              >
                <FileIcon size={12} />
                <span className="hidden sm:inline">{resumeData.language === 'fr' ? 'CV & Lettre' : 'CV & Letter'}</span>
              </button>
              <button 
                onClick={() => setAppMode('tracker')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium ${appMode === 'tracker' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white'}`}
                title={resumeData.language === 'fr' ? 'Suivi des candidatures' : 'Applications Tracker'}
              >
                <Briefcase size={12} />
                <span className="hidden sm:inline">{resumeData.language === 'fr' ? 'Candidatures' : 'Tracker'}</span>
              </button>
            </div>
          </div>
          <div className="flex gap-3 items-center text-sm font-medium">
            {isTranslating ? (
              <span className="flex items-center text-yellow-400 bg-gray-800 px-3 py-1.5 rounded animate-pulse">
                <Loader2 size={16} className="animate-spin mr-2" /> {t.translating}
              </span>
            ) : (
              <div className="flex items-center gap-1 bg-gray-800 p-0.5 rounded mr-2">
                <span className="text-gray-400 px-2 flex items-center text-xs uppercase" title={t.translateResume}>
                  <Languages size={14} className="mr-1" /> {t.translateResume}:
                </span>
                <button 
                  className="px-2 py-1 rounded text-xs transition-colors hover:bg-gray-700 text-gray-300"
                  onClick={() => handleTranslate('en')}
                >
                  EN
                </button>
                <button 
                  className="px-2 py-1 rounded text-xs transition-colors hover:bg-gray-700 text-gray-300"
                  onClick={() => handleTranslate('fr')}
                >
                  FR
                </button>
              </div>
            )}
            
            <div className="h-6 w-px bg-gray-700"></div>
 
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
              title={resumeData.language === 'fr' ? 'Changer de thème' : 'Switch Theme'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <button 
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
              title="Settings"
            >
              <Settings size={18} />
            </button>
            <div className="flex gap-1 bg-gray-800 p-0.5 rounded">
              <button 
                className={`px-3 py-1 rounded transition-colors ${resumeData.language === 'en' ? 'bg-blue-600 shadow' : 'hover:bg-gray-700'}`}
                onClick={() => setResumeData({...resumeData, language: 'en'})}
              >
                EN
              </button>
              <button 
                className={`px-3 py-1 rounded transition-colors ${resumeData.language === 'fr' ? 'bg-blue-600 shadow' : 'hover:bg-gray-700'}`}
                onClick={() => setResumeData({...resumeData, language: 'fr'})}
              >
                FR
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scroll-smooth bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 shadow-inner">
          {appMode === 'tracker' ? (
            selectedApplication ? (
              <ApplicationDetail 
                application={selectedApplication} 
                activeResumeData={resumeData}
                onBack={() => setSelectedApplication(null)}
                onUpdate={async (updated) => {
                  setSelectedApplication(updated);
                  // Securely sync to PostgreSQL if connected, otherwise fallback
                  try {
                    const online = await apiService.checkHealth();
                    if (online && apiService.isLoggedIn()) {
                      await apiService.saveApplication(updated);
                      return;
                    }
                  } catch (err) {
                    console.warn("Cloud save failed, saving to local storage fallback", err);
                  }

                  const stored = localStorage.getItem('ats_applications_tracker');
                  if (stored) {
                    const parsed = JSON.parse(stored) as JobApplication[];
                    const next = parsed.map(app => app.id === updated.id ? updated : app);
                    try {
                      localStorage.setItem('ats_applications_tracker', JSON.stringify(next));
                    } catch (e: any) {
                      console.error('Error updating application in localStorage:', e);
                      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
                        alert(resumeData.language === 'fr'
                          ? "Erreur : Mémoire locale saturée. Impossible d'enregistrer la candidature."
                          : "Error: Local storage is full. Unable to save the application updates.");
                      }
                    }
                  }
                }}
                language={resumeData.language}
              />
            ) : (
              <ApplicationTracker 
                activeResumeData={resumeData} 
                onSelectApplication={setSelectedApplication} 
                language={resumeData.language}
              />
            )
          ) : (
            <>
              <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                <p className="text-gray-500 text-sm dark:text-gray-400">{t.subtitle}</p>
                <div className="flex gap-2">
                  <label className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 rounded-full font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer">
                    {resumeData.language === 'fr' ? 'Importer JSON (.json)' : 'Import JSON (.json)'}
                    <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <button 
                    onClick={handleExport}
                    className="text-xs bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 px-3 py-1.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition cursor-pointer"
                  >
                    {resumeData.language === 'fr' ? 'Exporter JSON' : 'Export JSON'}
                  </button>
                  <button 
                    onClick={() => setShowImportOpen(true)}
                    className="text-xs bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 px-3 py-1.5 rounded-full font-medium border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer"
                  >
                    {t.quickImport}
                  </button>
                </div>
              </div>
              <ResumeForm 
                data={resumeData} 
                onChange={setResumeData} 
                missingKeywords={atsResult.missingKeywords} 
                activeVersion={activeVersion}
                setActiveVersion={setActiveVersion}
              />
            </>
          )}
        </main>
      </div>

      {/* Live Preview Area */}
      <div className="w-1/2 flex flex-col bg-gray-100 dark:bg-gray-950 transition-colors">
        <OptimizationDashboard data={resumeData} onChange={setResumeData} result={atsResult} setAiKeywords={setAiKeywords} />

        <header className="px-6 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg transition-colors">
              <button 
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${previewTab === 'cv' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                onClick={() => setPreviewTab('cv')}
              >
                📄 {resumeData.language === 'fr' ? 'Mon CV' : 'My CV'}
              </button>
              <button 
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${previewTab === 'cl' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                onClick={() => setPreviewTab('cl')}
              >
                ✉️ {resumeData.language === 'fr' ? 'Lettre de Motivation' : 'Cover Letter'}
              </button>
            </div>
            {isGeneratingPreview && (
              <span className="flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full font-medium border border-indigo-100 dark:border-indigo-900/50 animate-pulse transition-all">
                <Loader2 size={11} className="animate-spin text-indigo-500 dark:text-indigo-400" />
                <span>{resumeData.language === 'fr' ? 'Synchronisation...' : 'Syncing...'}</span>
              </span>
            )}
            {cvSaveStatus !== 'idle' && (
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all border ${
                cvSaveStatus === 'saving' 
                  ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 animate-pulse'
                  : cvSaveStatus === 'saved'
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                  : 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
              }`}>
                <span>
                  {cvSaveStatus === 'saving' && (resumeData.language === 'fr' ? 'Enregistrement...' : 'Saving...')}
                  {cvSaveStatus === 'saved' && (resumeData.language === 'fr' ? 'Enregistré' : 'Saved')}
                  {cvSaveStatus === 'error' && (resumeData.language === 'fr' ? 'Erreur' : 'Error')}
                </span>
              </span>
            )}
          </div>

          <PDFDownloadLink 
            document={memoizedPdfDocument} 
            fileName={previewTab === 'cv' 
              ? `${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.pdf`
              : `${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_Cover_Letter.pdf`
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm text-xs font-semibold transition-colors"
          >
            {({ loading }) => (loading ? t.generatingPdf : t.downloadPdf)}
          </PDFDownloadLink>
        </header>

        {previewTab === 'cv' && (
          <StyleControls 
            settings={resumeData.styleSettings || {
              template: 'classic',
              themeColor: 'slate',
              fontFamily: 'Helvetica',
              fontSize: 'medium'
            }}
            onChange={(newSettings) => setResumeData({ ...resumeData, styleSettings: newSettings })}
            language={resumeData.language}
          />
        )}
        
        <main className="flex-1 overflow-hidden p-0 bg-gray-200 dark:bg-gray-900 flex flex-col transition-colors">
          <PDFViewer width="100%" height="100%" className="border-none flex-1">
            {memoizedPdfDocument}
          </PDFViewer>
        </main>
      </div>

      <ImportModal isOpen={showImportOpen} onClose={() => setShowImportOpen(false)} onImport={handleImport} language={resumeData.language} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} language={resumeData.language} />
    </div>
  );
}

export default App;
