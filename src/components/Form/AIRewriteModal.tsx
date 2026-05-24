import { useState } from 'react';
import type { Language } from '../../types/resume';
import { rewriteExperienceWithGemini, rewriteSkillsWithGemini } from '../../utils/geminiApiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  missingKeywords: string[];
  language: Language;
  onApply: (newText: string) => void;
  mode?: 'experience' | 'skills';
}

export default function AIRewriteModal({ isOpen, onClose, originalText, missingKeywords, language, onApply, mode = 'experience' }: Props) {
  const [tone, setTone] = useState<string>('Professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [proposedText, setProposedText] = useState('');
  const [customDirectives, setCustomDirectives] = useState('');

  if (!isOpen) return null;

  const handleRewrite = async () => {
    setError('');
    setLoading(true);
    try {
      const apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) throw new Error('Missing Gemini API Key. Please add it in Settings.');
      
      let newText = '';
      if (mode === 'skills') {
        newText = await rewriteSkillsWithGemini(apiKey, originalText, missingKeywords, language, customDirectives);
      } else {
        newText = await rewriteExperienceWithGemini(apiKey, originalText, missingKeywords, tone, language, customDirectives);
      }
      setProposedText(newText);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const isFrench = language === 'fr';

  // Quick directives presets based on mode
  const presets = mode === 'experience' 
    ? [
        { label: isFrench ? '🎯 Résultats / KPI' : '🎯 Results / KPI', value: isFrench ? 'Insister sur les réalisations chiffrées et les résultats mesurables (KPIs).' : 'Emphasize measurable results and key performance metrics (KPIs).' },
        { label: isFrench ? '🧩 Plus court' : '🧩 Shorter', value: isFrench ? 'Rendre la description extrêmement concise et percutante.' : 'Make the description extremely concise and punchy.' },
        { label: isFrench ? '💻 Plus technique' : '💻 More technical', value: isFrench ? 'Mettre en avant les aspects techniques, l\'architecture et les technologies clés.' : 'Highlight technical architecture and core technologies.' },
        { label: isFrench ? '🔄 Reconversion' : '🔄 Transferable skills', value: isFrench ? 'Mettre en avant les compétences transférables adaptées à un changement de poste.' : 'Highlight transferable skills adapted for a career transition.' }
      ]
    : [
        { label: isFrench ? '💻 Hard Skills' : '💻 Hard Skills', value: isFrench ? 'Prioriser les compétences techniques dures.' : 'Prioritize core technical hard skills.' },
        { label: isFrench ? '🧠 Soft Skills' : '🧠 Soft Skills', value: isFrench ? 'Inclure des compétences humaines (leadership, communication).' : 'Include interpersonal and soft skills (leadership, communication).' }
      ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950 rounded-t-xl">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            ✨ {isFrench ? 'Réécriture avec IA' : 'AI Rewrite'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
           {/* Context */}
           <div className="mb-4 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-lg">
             <div className="text-xs font-semibold text-blue-800 dark:text-blue-400 mb-1">{isFrench ? 'Contexte' : 'Context'}</div>
             <p className="text-[10px] text-blue-600 dark:text-blue-300 mb-1">
               {isFrench 
                 ? "L'IA tentera d'intégrer naturellement les mots-clés manquants suivants extraits de votre description de poste (s'ils sont pertinents) :" 
                 : "The AI will attempt to weave in the following missing keywords from your target Job Description naturally (if relevant):"}
             </p>
             <div className="flex flex-wrap gap-1">
               {missingKeywords.length === 0 ? <span className="text-[10px] italic text-blue-500">None detected.</span> : missingKeywords.map(k => <span key={k} className="px-2 py-0.5 text-[9px] font-medium bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full">{k}</span>)}
             </div>
           </div>

           {/* Tone */}
           {mode === 'experience' && (
             <div className="mb-4">
               <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                 {isFrench ? 'Sélectionner le ton' : 'Select Tone'}
               </label>
               <div className="flex gap-2">
                 {['Professional', 'Dynamic', 'Executive'].map(t => (
                   <button 
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${tone === t ? 'bg-blue-600 dark:bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                   >
                     {t}
                   </button>
                 ))}
               </div>
             </div>
           )}

           {/* Copilot Directives */}
           <div className="mb-5">
             <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
               {isFrench ? 'Copilote IA : Vos consignes particulières (Optionnel)' : 'AI Copilot: Your Custom Directives (Optional)'}
             </label>
             <input 
               type="text"
               value={customDirectives}
               onChange={(e) => setCustomDirectives(e.target.value)}
               placeholder={isFrench ? "Ex: Mettre en valeur la méthodologie agile et l'architecture cloud..." : "e.g. Highlight agile methodology and cloud architecture..."}
               className="w-full p-2 text-xs border border-gray-300 dark:border-gray-750 dark:bg-gray-950 dark:text-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-2 transition-all"
             />
             <div className="flex flex-wrap gap-1.5">
               {presets.map(p => (
                 <button
                   key={p.label}
                   onClick={() => setCustomDirectives(p.value)}
                   className={`px-2 py-1 rounded text-[10px] font-medium border transition cursor-pointer ${customDirectives === p.value ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-900 text-indigo-700 dark:text-indigo-350' : 'bg-gray-50 dark:bg-gray-955 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'}`}
                 >
                   {p.label}
                 </button>
               ))}
               {customDirectives && (
                 <button 
                   onClick={() => setCustomDirectives('')}
                   className="px-2 py-1 rounded text-[10px] font-bold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/60 cursor-pointer"
                 >
                   {isFrench ? 'Effacer' : 'Clear'}
                 </button>
               )}
             </div>
           </div>

           {/* Original vs Proposed */}
           <div className="grid grid-cols-2 gap-6">
             <div>
               <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">{isFrench ? 'Texte original' : 'Original Text'}</h4>
               <textarea 
                  value={originalText}
                  disabled
                  className="w-full h-44 p-3 text-xs bg-gray-50 dark:bg-gray-955/50 border border-gray-200 dark:border-gray-800 rounded text-gray-500 dark:text-gray-400 resize-none font-mono leading-relaxed"
               />
             </div>
             <div>
               <h4 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">{proposedText ? (isFrench?'Proposition IA':'AI Proposal') : (isFrench?'Prêt à réécrire':'Ready to Rewrite')}</h4>
               {loading ? (
                 <div className="w-full h-44 flex items-center justify-center border border-indigo-100 dark:border-indigo-950/20 rounded bg-indigo-50/20 dark:bg-indigo-950/10">
                    <span className="text-xs font-medium text-indigo-500 dark:text-indigo-400 animate-pulse">
                      {isFrench ? 'Génération en cours...' : 'Generating...'}
                    </span>
                 </div>
               ) : (
                 <textarea 
                    value={proposedText}
                    onChange={(e) => setProposedText(e.target.value)}
                    className="w-full h-44 p-3 text-xs border border-indigo-200 dark:border-indigo-900/50 dark:bg-gray-950 dark:text-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed transition-colors"
                    placeholder={isFrench ? "Cliquez sur 'Générer la réécriture' ci-dessous pour lancer l'IA." : "Click 'Generate Rewrite' below to query the AI."}
                 />
               )}
             </div>
           </div>

           {error && <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded">{error}</div>}
           <div className="mt-4 text-[10px] text-gray-400 dark:text-gray-500">
              {isFrench 
                ? "Avis de non-responsabilité : Veuillez vérifier que le texte réécrit reflète fidèlement vos véritables réalisations professionnelles."
                : "Disclaimer: Please verify that the rewritten text accurately reflects your actual professional achievements."}
           </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-between gap-3 bg-gray-50 dark:bg-gray-950 rounded-b-xl">
          <button 
            onClick={handleRewrite} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-900/40 text-white font-medium rounded transition cursor-pointer"
          >
            ✨ {isFrench ? 'Générer la réécriture' : 'Generate Rewrite'}
          </button>
          
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-350 rounded bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              {isFrench ? 'Annuler' : 'Cancel'}
            </button>
            <button 
              onClick={() => { onApply(proposedText); onClose(); }} 
              disabled={!proposedText || loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900/40 text-white rounded font-medium cursor-pointer"
            >
              {isFrench ? 'Appliquer au CV' : 'Apply to Resume'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
