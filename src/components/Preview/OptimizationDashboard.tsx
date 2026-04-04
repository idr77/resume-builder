import React from 'react';
import type { ResumeData } from '../../types/resume';
import type { OptimizationResult } from '../../utils/atsOptimizer';

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  result: OptimizationResult;
}

export default function OptimizationDashboard({ data, onChange, result }: Props) {
  const lang = data.language;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="p-4 grid grid-cols-3 gap-4">
        {/* Left: Job Description Input */}
        <div className="col-span-1 border-r border-gray-200 pr-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            {lang === 'fr' ? 'Description de poste (Cible)' : 'Target Job Description'}
          </label>
          <textarea
            className="w-full h-24 p-2 text-xs border border-gray-300 rounded focus:border-blue-500"
            placeholder={lang === 'fr' ? "Collez l'annonce ici..." : "Paste job offer here..."}
            value={data.targetJobDescription || ''}
            onChange={(e) => onChange({ ...data, targetJobDescription: e.target.value })}
          />
        </div>
        
        {/* Middle: Score & Breakdown */}
        <div className="col-span-2 flex gap-4">
          <div className="flex flex-col items-center justify-center p-2 min-w-[80px]">
             <div className="text-3xl font-bold text-gray-800">
               {result.matchScore}%
             </div>
             <div className="text-xs text-gray-500 font-medium whitespace-nowrap">Match Score</div>
          </div>
          
          <div className="flex-1 space-y-2 overflow-y-auto h-24 pr-2">
             {result.targetKeywords.length === 0 ? (
               <p className="text-xs text-gray-400 italic mt-2">
                 {lang === 'fr' ? 'Collez la description pour voir les mots-clés.' : 'Paste a JD to analyze keywords.'}
               </p>
             ) : (
               <>
                 <div>
                   <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1 block">
                     {lang === 'fr' ? 'Manquants' : 'Missing'}
                   </span>
                   <div className="flex flex-wrap gap-1">
                     {result.missingKeywords.length === 0 && <span className="text-xs text-green-600">None! 🎉</span>}
                     {result.missingKeywords.map(k => (
                       <span key={k} className="px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 rounded-full">{k}</span>
                     ))}
                   </div>
                 </div>
                 
                 <div>
                   <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1 block mt-2">
                     {lang === 'fr' ? 'Trouvés' : 'Found'}
                   </span>
                   <div className="flex flex-wrap gap-1">
                     {result.foundKeywords.length === 0 && <span className="text-xs text-gray-400">None yet.</span>}
                     {result.foundKeywords.map(k => (
                       <span key={k} className="px-2 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 rounded-full">{k}</span>
                     ))}
                   </div>
                 </div>
               </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
