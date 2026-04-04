import React, { useState, useMemo } from 'react';
import { initialResumeState, type ResumeData } from './types/resume';
import ResumeForm from './components/Form/ResumeForm';
import PDFTemplate from './components/Preview/PDFTemplate';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import ImportModal from './components/Form/ImportModal';
import { getTranslation } from './i18n/translations';
import SettingsModal from './components/Form/SettingsModal';
import OptimizationDashboard from './components/Preview/OptimizationDashboard';
import { analyzeResumeMatch } from './utils/atsOptimizer';
import { Settings } from 'lucide-react';

function App() {
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeState);
  const [showImportOpen, setShowImportOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const atsResult = useMemo(() => analyzeResumeMatch(resumeData), [resumeData]);

  const handleImport = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && parsed.personalInfo) {
        setResumeData({ ...resumeData, ...parsed, language: resumeData.language }); // Keep current language setting
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

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Sidebar / Form Area */}
      <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white">
        <header className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-900 text-white shadow-md z-10">
          <h1 className="text-xl font-bold tracking-wide">{t.title}</h1>
          <div className="flex gap-3 items-center text-sm font-medium">
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

        <main className="flex-1 overflow-y-auto p-6 scroll-smooth bg-gray-50 border-r border-gray-200 shadow-inner">
          <div className="mb-4 flex justify-between items-center">
            <p className="text-gray-500 text-sm">{t.subtitle}</p>
            <div className="flex gap-2">
              <button 
                onClick={handleExport}
                className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full font-medium border border-emerald-200 hover:bg-emerald-100 transition"
              >
                {resumeData.language === 'fr' ? 'Exporter JSON' : 'Export JSON'}
              </button>
              <button 
                onClick={() => setShowImportOpen(true)}
                className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full font-medium border border-indigo-200 hover:bg-indigo-100 transition"
              >
                {t.quickImport}
              </button>
            </div>
          </div>
          <ResumeForm data={resumeData} onChange={setResumeData} missingKeywords={atsResult.missingKeywords} />
        </main>
      </div>

      {/* Live Preview Area */}
      <div className="w-1/2 flex flex-col bg-gray-100">
        <OptimizationDashboard data={resumeData} onChange={setResumeData} result={atsResult} />

        <header className="px-6 py-4 border-b border-gray-200 bg-white shadow-sm flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">{t.livePreview}</h2>
          <PDFDownloadLink 
            document={<PDFTemplate data={resumeData} template="classic" />} 
            fileName={`${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.pdf`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm font-medium transition-colors"
          >
            {({ loading }) => (loading ? t.generatingPdf : t.downloadPdf)}
          </PDFDownloadLink>
        </header>
        
        <main className="flex-1 overflow-hidden p-0 bg-gray-200 flex flex-col">
          <PDFViewer width="100%" height="100%" className="border-none flex-1">
            <PDFTemplate data={resumeData} template="classic" />
          </PDFViewer>
        </main>
      </div>

      <ImportModal isOpen={showImportOpen} onClose={() => setShowImportOpen(false)} onImport={handleImport} language={resumeData.language} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} language={resumeData.language} />
    </div>
  );
}

export default App;
