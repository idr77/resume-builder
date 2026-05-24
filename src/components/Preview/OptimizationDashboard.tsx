import { useState } from 'react';
import type { ResumeData } from '../../types/resume';
import type { OptimizationResult } from '../../utils/atsOptimizer';
import { extractKeywordsWithGemini } from '../../utils/geminiApiService';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Sparkles, UserCheck, ShieldAlert, BadgeCheck } from 'lucide-react';

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  result: OptimizationResult;
  setAiKeywords: (keywords: string[]) => void;
}

export default function OptimizationDashboard({ data, onChange, result, setAiKeywords }: Props) {
  const lang = data.language;
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  const handleExtractKeywords = async () => {
    try {
      const apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) {
        alert(lang === 'fr' ? "Clé API Gemini manquante. Allez dans les paramètres." : "Missing Gemini API Key. Go to Settings.");
        return;
      }
      setIsExtracting(true);
      const keywords = await extractKeywordsWithGemini(apiKey, data.targetJobDescription || '', lang);
      setAiKeywords(keywords);
    } catch (e) {
      alert(lang === 'fr' ? "Échec de l'extraction." : "Extraction failed.");
    } finally {
      setIsExtracting(false);
    }
  };

  const alignJobTitle = () => {
    if (result.titleAnalysis && result.titleAnalysis.targetTitle) {
      onChange({
        ...data,
        personalInfo: {
          ...data.personalInfo,
          jobTitle: result.titleAnalysis.targetTitle
        }
      });
    }
  };

  const isFrench = lang === 'fr';

  return (
    <div className="bg-white border-b border-gray-200">
      
      {/* Primary keywords & score view */}
      <div className="p-4 grid grid-cols-3 gap-4">
        {/* Left: Job Description Input */}
        <div className="col-span-1 border-r border-gray-200 pr-4 flex flex-col gap-2">
          <label className="block text-xs font-semibold text-gray-600">
            {isFrench ? 'Description de poste (Cible)' : 'Target Job Description'}
          </label>
          <textarea
            className="w-full h-16 p-2 text-xs border border-gray-300 rounded focus:border-indigo-500 resize-none font-sans"
            placeholder={isFrench ? "Collez l'annonce ici..." : "Paste job offer here..."}
            value={data.targetJobDescription || ''}
            onChange={(e) => onChange({ ...data, targetJobDescription: e.target.value })}
          />
          <button 
             disabled={isExtracting || !data.targetJobDescription}
             onClick={handleExtractKeywords}
             className="text-[10px] w-full py-1 text-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium rounded transition disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer flex justify-center items-center gap-1"
          >
            <Sparkles size={10} />
            {isExtracting ? (isFrench ? 'Extraction...' : 'Extracting...') : (isFrench ? 'Extraire des mots-clés' : 'Extract Keywords')}
          </button>
        </div>
        
        {/* Middle: Score & Breakdown */}
        <div className="col-span-2 flex gap-4">
          <div className="flex flex-col items-center justify-center p-2 min-w-[90px] bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-100/50">
             <div className="text-3xl font-bold text-indigo-800">
               {result.matchScore}%
             </div>
             <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider whitespace-nowrap mt-1">Match Score</div>
          </div>
          
          <div className="flex-1 space-y-2 overflow-y-auto h-24 pr-2 scrollbar-thin">
             {result.targetKeywords.length === 0 ? (
               <p className="text-xs text-gray-400 italic mt-4">
                 {isFrench ? 'Collez la description pour voir les mots-clés.' : 'Paste a JD to analyze keywords.'}
               </p>
             ) : (
               <>
                 <div>
                   <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider mb-1 block">
                     {isFrench ? 'Manquants' : 'Missing'} ({result.missingKeywords.length})
                   </span>
                   <div className="flex flex-wrap gap-1">
                     {result.missingKeywords.length === 0 && <span className="text-xs text-green-600">None! 🎉</span>}
                     {result.missingKeywords.map(k => (
                       <span key={k} className="px-2 py-0.5 text-[9px] font-medium bg-red-50 text-red-700 border border-red-150 rounded-full">{k}</span>
                     ))}
                   </div>
                 </div>
                 
                 <div>
                   <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1 block mt-2">
                     {isFrench ? 'Trouvés' : 'Found'} ({result.foundKeywords.length})
                   </span>
                   <div className="flex flex-wrap gap-1">
                     {result.foundKeywords.length === 0 && <span className="text-xs text-gray-400">None yet.</span>}
                     {result.foundKeywords.map(k => (
                       <span key={k} className="px-2 py-0.5 text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full">{k}</span>
                     ))}
                   </div>
                 </div>
               </>
             )}
          </div>
        </div>
      </div>

      {/* Expanded Premium ATS Diagnostic */}
      <div className="border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={() => setIsDiagnosticOpen(!isDiagnosticOpen)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs font-bold text-gray-700 hover:bg-gray-100/70 transition-colors border-b border-gray-100"
        >
          <span className="flex items-center gap-1.5 text-indigo-700">
            <BadgeCheck size={14} />
            {isFrench ? '📊 Diagnostic ATS Premium' : '📊 Premium ATS Audit'}
          </span>
          {isDiagnosticOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isDiagnosticOpen && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-100 animate-fade-in text-xs">
            
            {/* Title Match Analysis */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <UserCheck size={12} className="text-indigo-500" />
                  {isFrench ? 'Intitulé de Poste' : 'Job Title Match'}
                </h4>
                
                <div className="my-2">
                  <div className="text-[10px] text-gray-400">{isFrench ? 'Sur le CV :' : 'On Resume:'}</div>
                  <div className="font-semibold text-gray-700">{data.personalInfo.jobTitle || '-'}</div>
                  
                  {result.titleAnalysis.targetTitle && (
                    <>
                      <div className="text-[10px] text-gray-400 mt-1">{isFrench ? 'Sur l\'offre :' : 'On Offer:'}</div>
                      <div className="font-semibold text-indigo-700">{result.titleAnalysis.targetTitle}</div>
                    </>
                  )}
                </div>

                <div className="flex items-start gap-1 p-1.5 bg-gray-50 rounded text-[10px] leading-relaxed text-gray-600">
                  {result.titleAnalysis.match === 'exact' ? (
                    <CheckCircle size={10} className="text-green-500 shrink-0 mt-0.5" />
                  ) : result.titleAnalysis.match === 'partial' ? (
                    <AlertTriangle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={10} className="text-red-500 shrink-0 mt-0.5" />
                  )}
                  <span>{result.titleAnalysis.recommendation}</span>
                </div>
              </div>

              {result.titleAnalysis.match !== 'exact' && result.titleAnalysis.targetTitle && (
                <button
                  onClick={alignJobTitle}
                  className="mt-3 w-full py-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold shadow-sm transition-colors cursor-pointer"
                >
                  ⚡ {isFrench ? 'Adapter le titre du CV' : 'Align Job Title'}
                </button>
              )}
            </div>

            {/* Contact Audit */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <ShieldAlert size={12} className="text-indigo-500" />
                  {isFrench ? 'Audit Coordonnées' : 'Contact Audit'}
                </h4>
                
                {/* Score */}
                <div className="flex justify-between items-center my-2">
                  <span className="text-[10px] font-medium text-gray-500">{isFrench ? 'Score de complétude :' : 'Completeness Score:'}</span>
                  <span className="font-bold text-indigo-600">{result.contactAnalysis.score}/100</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${result.contactAnalysis.score >= 80 ? 'bg-green-500' : 'bg-amber-500'}`} 
                    style={{ width: `${result.contactAnalysis.score}%` }} 
                  />
                </div>

                {/* Audit points */}
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Email</span>
                    {result.contactAnalysis.hasEmail ? <span className="text-green-500 font-bold">✓</span> : <span className="text-red-500 font-bold">✗</span>}
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>{isFrench ? 'Téléphone' : 'Phone'}</span>
                    {result.contactAnalysis.hasPhone ? <span className="text-green-500 font-bold">✓</span> : <span className="text-red-500 font-bold">✗</span>}
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>LinkedIn</span>
                    {result.contactAnalysis.hasLinkedIn ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-400">✗ (Optionnel)</span>}
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Portfolio</span>
                    {result.contactAnalysis.hasPortfolio ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-400">✗ (Optionnel)</span>}
                  </div>
                </div>
              </div>

              {result.contactAnalysis.missingCrucial.length > 0 && (
                <div className="mt-3 p-1 text-[10px] text-red-600 font-semibold bg-red-50 rounded border border-red-100 text-center">
                  ⚠️ {isFrench ? 'Coordonnées critiques manquantes !' : 'Missing critical details!'}
                </div>
              )}
            </div>

            {/* Action Verbs Analysis */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Sparkles size={12} className="text-indigo-500" />
                  {isFrench ? 'Verbes d\'Action' : 'Action Verbs Scanner'}
                </h4>
                
                {/* Score */}
                <div className="flex justify-between items-center my-2">
                  <span className="text-[10px] font-medium text-gray-500">{isFrench ? 'Verbes détectés :' : 'Verbs Found:'}</span>
                  <span className="font-bold text-indigo-600">{result.actionVerbsAnalysis.count}</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${result.actionVerbsAnalysis.score >= 60 ? 'bg-green-500' : 'bg-amber-500'}`} 
                    style={{ width: `${result.actionVerbsAnalysis.score}%` }} 
                  />
                </div>

                {/* Found verbs cloud */}
                <div className="max-h-12 overflow-y-auto pr-1 flex flex-wrap gap-1 mb-2">
                  {result.actionVerbsAnalysis.foundVerbs.length === 0 ? (
                    <span className="text-[10px] italic text-gray-400">{isFrench ? 'Aucun verbe détecté.' : 'No verbs detected.'}</span>
                  ) : (
                    result.actionVerbsAnalysis.foundVerbs.map(v => (
                      <span key={v} className="px-1 py-0.2 bg-indigo-50 text-[9px] text-indigo-700 rounded border border-indigo-100/50">{v}</span>
                    ))
                  )}
                </div>
              </div>

              <div className="p-1.5 bg-gray-50 rounded text-[9px] leading-relaxed text-gray-600 mt-2">
                {result.actionVerbsAnalysis.recommendations[0]}
              </div>
            </div>

          </div>
        )}
      </div>
      
    </div>
  );
}
