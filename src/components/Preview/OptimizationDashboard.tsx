import { useState } from 'react';
import type { ResumeData } from '../../types/resume';
import type { OptimizationResult } from '../../utils/atsOptimizer';
import { extractKeywordsWithGemini, generateAtsAdviceWithGemini } from '../../utils/geminiApiService';
import { apiService } from '../../utils/apiService';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Sparkles, UserCheck, ShieldAlert, BadgeCheck, Loader2 } from 'lucide-react';
import MarkdownRenderer from '../Common/MarkdownRenderer';

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  result: OptimizationResult;
  setAiKeywords: (keywords: string[]) => void;
}

export default function OptimizationDashboard({ data, onChange, result, setAiKeywords }: Props) {
  const lang = data.language;
  const isFrench = lang === 'fr';
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  // States for Premium AI ATS Advice
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState<string>('');

  const handleGenerateAiAdvice = async () => {
    setAdviceError('');
    setIsGeneratingAdvice(true);
    try {
      const online = await apiService.checkHealth();
      const isCloudConnected = online && apiService.isLoggedIn();
      const apiKey = localStorage.getItem('gemini_api_key');
      
      if (!apiKey && !isCloudConnected) {
        throw new Error(isFrench 
          ? "Clé API Gemini manquante. Veuillez configurer votre clé dans les paramètres ou vous connecter." 
          : "Missing Gemini API Key. Please configure your key in Settings or log in.");
      }

      // Look for a skills dossier associated with this job description in the applications tracker
      let skillsDossierText = '';
      try {
        const stored = localStorage.getItem('ats_applications_tracker');
        if (stored) {
          const apps = JSON.parse(stored) as any[];
          // Match if the JD contains or matches a part of it
          const match = apps.find(app => 
            app.skillsDossierText && 
            app.skillsDossierText.trim() &&
            (app.jobDescription === data.targetJobDescription || 
             (data.targetJobDescription && app.jobDescription && 
              (data.targetJobDescription.includes(app.jobDescription.slice(0, 50)) || 
               app.jobDescription.includes(data.targetJobDescription.slice(0, 50)))))
          );
          if (match) {
            skillsDossierText = match.skillsDossierText;
            console.log("Found matching skills dossier from tracker application:", match.companyName);
          }
        }
      } catch (err) {
        console.warn("Failed to lookup matching skills dossier", err);
      }

      const systemPrompt = isFrench
        ? "Vous êtes un consultant en recrutement expert et un spécialiste de l'optimisation de CV pour les systèmes ATS. Votre but est de fournir des conseils ultra-précis pour adapter le CV d'un candidat à une offre d'emploi."
        : "You are an expert recruitment consultant and ATS resume optimization specialist. Your goal is to provide ultra-precise feedback to align a candidate's CV with a target job description.";

      const dossierSection = skillsDossierText.trim()
        ? `\nDocument d'antécédents / Dossier de compétences supplémentaire :\n${skillsDossierText.trim()}\n`
        : '';

      // Clean builder state variables (targetJobDescription, coverLetter) from CV data to prevent prompt bleeding/bloat
      const { targetJobDescription, coverLetter, ...cleanedData } = data || {};

      const userPrompt = `
        Offre d'emploi (Cible) : "${data.targetJobDescription || 'Non spécifiée'}"
        CV Actuel (JSON) : ${JSON.stringify(cleanedData)}
        ${dossierSection}

        Tâche : Réalisez un audit ATS complet et donnez des recommandations ultra-actionnables structurées exactement ainsi :
        
        ### 📊 Analyse d'adéquation globale
        (Donnez un score d'adéquation estimé sur 100 avec une analyse brève du profil face au poste)
        
        ### ➕ Éléments clés à AJOUTER au CV
        (Listez précisément les mots-clés, technologies, soft skills, certifications ou formulations de réalisations manquantes sur le CV mais exigées par l'offre, et dites où et comment les insérer de manière naturelle sans suroptimisation artificielle)
        
        ### ➖ Éléments à SUPPRIMER ou reformuler
        (Identifiez les technologies obsolètes, les expériences hors sujet par rapport à l'offre cible, les buzzwords inutiles ou les tournures passives à supprimer ou remplacer par des formulations dynamiques et chiffrées)
        
        ### 💡 Conseils de formulation et mise en valeur
        (Donnez 3 exemples concrets de bullet points de vos expériences actuelles réécrits pour inclure les réalisations chiffrées/STAR adaptées à l'offre cible)

        Contraintes strictes :
        - Écrivez entièrement en ${isFrench ? 'Français' : 'English'}.
        - Pas d'introduction polie ni de blabla inutile, démarrez directement avec les titres markdown.
        - Soyez extrêmement concret, précis et réaliste.
      `;

      let response = '';
      if (isCloudConnected) {
        response = await apiService.proxyLlm(systemPrompt, userPrompt, 'GEMINI');
      } else {
        response = await generateAtsAdviceWithGemini(apiKey!, systemPrompt, userPrompt);
      }

      setAiAdvice(response);
    } catch (err: any) {
      setAdviceError(err.message || 'An error occurred.');
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  const handleExtractKeywords = async () => {
    try {
      const online = await apiService.checkHealth();
      const isCloudConnected = online && apiService.isLoggedIn();
      const apiKey = localStorage.getItem('gemini_api_key');
      
      if (!apiKey && !isCloudConnected) {
        alert(lang === 'fr' 
          ? "Clé API Gemini manquante. Allez dans les paramètres ou connectez-vous au Cloud." 
          : "Missing Gemini API Key. Go to Settings or connect to Cloud.");
        return;
      }
      
      setIsExtracting(true);
      let keywords: string[] = [];

      if (isCloudConnected) {
        // Secure call proxied through AI Gateway
        const systemPrompt = "Vous êtes un expert en recrutement ATS.";
        const userPrompt = `Analysez la description de poste ci-dessous et extrayez une liste de mots-clés techniques, technologiques et soft skills essentiels pour passer les filtres ATS. Retournez la réponse UNIQUEMENT sous forme de tableau de chaînes JSON brut, sans formatage markdown (ex: ["React", "Python", "Gestion de projet"]).
Description de poste : ${data.targetJobDescription}`;
        
        let response = await apiService.proxyLlm(systemPrompt, userPrompt, 'GEMINI');
        if (response.startsWith('```')) {
          response = response.replace(/^```json\n?|```$/g, '').trim();
        }
        keywords = JSON.parse(response);
      } else {
        // Fallback to direct client
        keywords = await extractKeywordsWithGemini(apiKey!, data.targetJobDescription || '', lang);
      }

      setAiKeywords(keywords);
    } catch (e) {
      alert(lang === 'fr' ? "Échec de l'extraction des mots-clés." : "Extraction failed.");
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

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors">
      
      {/* Primary keywords & score view */}
      <div className="p-4 grid grid-cols-3 gap-4">
        {/* Left: Job Description Input */}
        <div className="col-span-1 border-r border-gray-200 dark:border-gray-800 pr-4 flex flex-col gap-2">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
            {isFrench ? 'Description de poste (Cible)' : 'Target Job Description'}
          </label>
          <textarea
            className="w-full h-16 p-2 text-xs border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-indigo-500 resize-none font-sans transition-colors"
            placeholder={isFrench ? "Collez l'annonce ici..." : "Paste job offer here..."}
            value={data.targetJobDescription || ''}
            onChange={(e) => onChange({ ...data, targetJobDescription: e.target.value })}
          />
          <button 
             disabled={isExtracting || !data.targetJobDescription}
             onClick={handleExtractKeywords}
             className="text-[10px] w-full py-1 text-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium rounded transition disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 cursor-pointer flex justify-center items-center gap-1"
          >
            <Sparkles size={10} />
            {isExtracting ? (isFrench ? 'Extraction...' : 'Extracting...') : (isFrench ? 'Extraire des mots-clés' : 'Extract Keywords')}
          </button>
        </div>
        
        {/* Middle: Score & Breakdown */}
        <div className="col-span-2 flex gap-4">
          <div className="flex flex-col items-center justify-center p-2 min-w-[90px] bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 rounded-lg border border-indigo-100/50 dark:border-indigo-900/50">
             <div className="text-3xl font-bold text-indigo-800 dark:text-indigo-300">
                {result.matchScore}%
             </div>
             <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider whitespace-nowrap mt-1">Match Score</div>
          </div>
          
          <div className="flex-1 space-y-2 overflow-y-auto h-24 pr-2 scrollbar-thin">
             {result.targetKeywords.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-4">
                  {isFrench ? 'Collez la description pour voir les mots-clés.' : 'Paste a JD to analyze keywords.'}
                </p>
             ) : (
                <>
                  <div>
                    <span className="text-[9px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-1 block">
                      {isFrench ? 'Manquants' : 'Missing'} ({result.missingKeywords.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {result.missingKeywords.length === 0 && <span className="text-xs text-green-600 dark:text-green-400">None! 🎉</span>}
                      {result.missingKeywords.map(k => (
                        <span key={k} className="px-2 py-0.5 text-[9px] font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-150 dark:border-red-800 rounded-full">{k}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 block mt-2">
                      {isFrench ? 'Trouvés' : 'Found'} ({result.foundKeywords.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {result.foundKeywords.length === 0 && <span className="text-xs text-gray-400 dark:text-gray-500">None yet.</span>}
                      {result.foundKeywords.map(k => (
                        <span key={k} className="px-2 py-0.5 text-[9px] font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-150 dark:border-emerald-800 rounded-full">{k}</span>
                      ))}
                    </div>
                  </div>
                </>
             )}
          </div>
        </div>
      </div>

      {/* Expanded Premium ATS Diagnostic */}
      <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
        <button
          onClick={() => setIsDiagnosticOpen(!isDiagnosticOpen)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800"
        >
          <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
            <BadgeCheck size={14} />
            {isFrench ? '📊 Diagnostic ATS Premium' : '📊 Premium ATS Audit'}
          </span>
          {isDiagnosticOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isDiagnosticOpen && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-100 dark:border-gray-800 animate-fade-in text-xs">
            
            {/* Title Match Analysis */}
            <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col justify-between transition-colors">
              <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <UserCheck size={12} className="text-indigo-500 dark:text-indigo-400" />
                  {isFrench ? 'Intitulé de Poste' : 'Job Title Match'}
                </h4>
                
                <div className="my-2">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">{isFrench ? 'Sur le CV :' : 'On Resume:'}</div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{data.personalInfo.jobTitle || '-'}</div>
                  
                  {result.titleAnalysis.targetTitle && (
                    <>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{isFrench ? 'Sur l\'offre :' : 'On Offer:'}</div>
                      <div className="font-semibold text-indigo-700 dark:text-indigo-400">{result.titleAnalysis.targetTitle}</div>
                    </>
                  )}
                </div>

                <div className="flex items-start gap-1 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-[10px] leading-relaxed text-gray-600 dark:text-gray-400">
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
            <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col justify-between transition-colors">
              <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <ShieldAlert size={12} className="text-indigo-500 dark:text-indigo-400" />
                  {isFrench ? 'Audit Coordonnées' : 'Contact Audit'}
                </h4>
                
                {/* Score */}
                <div className="flex justify-between items-center my-2">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{isFrench ? 'Score de complétude :' : 'Completeness Score:'}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{result.contactAnalysis.score}/100</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-3">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${result.contactAnalysis.score >= 80 ? 'bg-green-500' : 'bg-amber-500'}`} 
                    style={{ width: `${result.contactAnalysis.score}%` }} 
                  />
                </div>

                {/* Audit points */}
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                    <span>Email</span>
                    {result.contactAnalysis.hasEmail ? <span className="text-green-500 font-bold">✓</span> : <span className="text-red-500 font-bold">✗</span>}
                  </div>
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                    <span>{isFrench ? 'Téléphone' : 'Phone'}</span>
                    {result.contactAnalysis.hasPhone ? <span className="text-green-500 font-bold">✓</span> : <span className="text-red-500 font-bold">✗</span>}
                  </div>
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                    <span>LinkedIn</span>
                    {result.contactAnalysis.hasLinkedIn ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-400 dark:text-gray-500">✗ (Optionnel)</span>}
                  </div>
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                    <span>Portfolio</span>
                    {result.contactAnalysis.hasPortfolio ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-400 dark:text-gray-500">✗ (Optionnel)</span>}
                  </div>
                </div>
              </div>

              {result.contactAnalysis.missingCrucial.length > 0 && (
                <div className="mt-3 p-1 text-[10px] text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-800 text-center">
                  ⚠️ {isFrench ? 'Coordonnées critiques manquantes !' : 'Missing critical details!'}
                </div>
              )}
            </div>

            {/* Action Verbs Analysis */}
            <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col justify-between transition-colors">
              <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <Sparkles size={12} className="text-indigo-500 dark:text-indigo-400" />
                  {isFrench ? 'Verbes d\'Action' : 'Action Verbs Scanner'}
                </h4>
                
                {/* Score */}
                <div className="flex justify-between items-center my-2">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{isFrench ? 'Verbes détectés :' : 'Verbs Found:'}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{result.actionVerbsAnalysis.count}</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-3">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${result.actionVerbsAnalysis.score >= 60 ? 'bg-green-500' : 'bg-amber-500'}`} 
                    style={{ width: `${result.actionVerbsAnalysis.score}%` }} 
                  />
                </div>

                {/* Found verbs cloud */}
                <div className="max-h-12 overflow-y-auto pr-1 flex flex-wrap gap-1 mb-2">
                  {result.actionVerbsAnalysis.foundVerbs.length === 0 ? (
                    <span className="text-[10px] italic text-gray-400 dark:text-gray-500">{isFrench ? 'Aucun verbe détecté.' : 'No verbs detected.'}</span>
                  ) : (
                    result.actionVerbsAnalysis.foundVerbs.map(v => (
                      <span key={v} className="px-1 py-0.2 bg-indigo-50 dark:bg-indigo-900/30 text-[9px] text-indigo-700 dark:text-indigo-300 rounded border border-indigo-100/50 dark:border-indigo-800">{v}</span>
                    ))
                  )}
                </div>
              </div>

              <div className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-[9px] leading-relaxed text-gray-600 dark:text-gray-400 mt-2">
                {result.actionVerbsAnalysis.recommendations[0]}
              </div>
            </div>

            {/* AI Optimization Advisor */}
            <div className="col-span-1 md:col-span-3 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/40 p-4 rounded-lg space-y-3 mt-2">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 text-xs">
                  <Sparkles size={14} className="text-indigo-500 animate-pulse" />
                  {isFrench ? '🔮 Conseiller ATS Intelligent (IA)' : '🔮 Intelligent ATS AI Advisor'}
                </h4>

                <button
                  type="button"
                  onClick={handleGenerateAiAdvice}
                  disabled={isGeneratingAdvice || !data.targetJobDescription}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 px-3.5 py-1.5 rounded-full font-bold text-[10px] shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingAdvice ? (
                    <><Loader2 size={12} className="animate-spin" /> {isFrench ? 'Analyse...' : 'Analyzing...'}</>
                  ) : (
                    <><Sparkles size={12} /> {isFrench ? 'Générer l\'audit d\'adéquation IA' : 'Generate AI Match Audit'}</>
                  )}
                </button>
              </div>

              {adviceError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 rounded text-[10px] font-semibold">{adviceError}</div>
              )}

              {aiAdvice ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800/80 rounded-lg p-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin shadow-inner transition-colors">
                  <MarkdownRenderer content={aiAdvice} />
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                  {isFrench
                    ? "Collez la description de poste dans l'encadré de gauche et cliquez sur le bouton ci-dessus pour obtenir un audit IA sur-mesure détaillant ce qu'il faut ajouter et supprimer de votre CV."
                    : "Paste the job description in the left-hand text area and click the button above to get a tailored AI audit highlighting keywords to add or remove from your CV."}
                </p>
              )}
            </div>

          </div>
        )}
      </div>
      
    </div>
  );
}
