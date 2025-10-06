"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { TrophyIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Achievement, Requirement } from "@/components/types";

interface AchievementsSectionProps {
  achievements: Achievement[];
  showRequirements: (item: { name: string, desc?: string, req?: Requirement }, itemType: 'achievement') => void;
}

export default function AchievementsSection({ achievements, showRequirements }: AchievementsSectionProps) {
  const { t } = useLanguage();
  return (
    <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><TrophyIcon className="w-6 h-6"/>{t('achievements')}</h3>
        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3">
        {achievements.map((ach) => {
          if (ach.type === 'shadow' && !ach.unlocked) {
            return (
              <motion.div 
                key={ach.id} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="aspect-square flex justify-center items-center bg-slate-500/10 rounded-lg border border-slate-700 transition-opacity cursor-pointer opacity-50" 
                title={t('secret_trophy')}
                onClick={() => showRequirements({ name: t('secret_trophy'), desc: t('secret_trophy_desc') }, 'achievement')}
              >
                <div className="text-3xl text-slate-500"><QuestionMarkCircleIcon className="w-8 h-8" /></div>
              </motion.div>
            );
          }
          
          return (
            <motion.div 
              key={ach.id} 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className={`aspect-square flex justify-center items-center bg-slate-500/10 rounded-lg border border-slate-700 transition-opacity cursor-pointer ${ach.unlocked ? 'opacity-100' : 'opacity-20'}`} 
              title={ach.unlocked ? `${t(ach.name)} - ${t(ach.desc)}`: t(ach.name)}
              onClick={() => showRequirements({ ...ach, name: t(ach.name), desc: t(ach.desc) }, 'achievement')}
            >
              <div className="text-3xl">{ach.unlocked ? '🏆' : '🔒'}</div>
            </motion.div>
          );
        })}
        </div>
    </div>
  );
}