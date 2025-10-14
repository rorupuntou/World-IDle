"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Trophy, QuestionMark } from 'iconoir-react';
import { Achievement, Requirement } from "@/components/types";
import clsx from "clsx";

interface AchievementsSectionProps {
  achievements: Achievement[];
  showRequirements: (item: { name: string, desc?: string, req?: Requirement }, itemType: 'achievement') => void;
}

export default function AchievementsSection({ achievements, showRequirements }: AchievementsSectionProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-4">
        <h3 className="text-xl font-semibold flex items-center gap-2 px-1"><Trophy className="w-6 h-6"/>{t('achievements')}</h3>
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
        {achievements.map((ach) => {
          const translatedName = t(ach.name);
          const translatedDesc = t(ach.desc);

          if (ach.type === 'shadow' && !ach.unlocked) {
            return (
              <motion.div 
                key={ach.id} 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="aspect-square flex justify-center items-center bg-slate-900/80 rounded-lg border border-slate-700 transition-all cursor-pointer hover:bg-slate-800"
                title={t('secret_trophy')}
                onClick={() => showRequirements({ name: t('secret_trophy'), desc: t('secret_trophy_desc') }, 'achievement')}
              >
                <QuestionMark className="w-8 h-8 text-slate-600" />
              </motion.div>
            );
          }
          
          return (
            <motion.div 
              key={ach.id} 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className={clsx(
                "aspect-square flex justify-center items-center rounded-lg border transition-all cursor-pointer hover:bg-slate-800",
                {
                  "bg-yellow-950/50 border-yellow-500 shadow-lg shadow-yellow-500/20": ach.unlocked,
                  "bg-slate-900/80 border-slate-800 opacity-50 grayscale": !ach.unlocked
                }
              )}
              title={ach.unlocked ? `${translatedName} - ${translatedDesc}`: translatedName}
              onClick={() => showRequirements({ ...ach, name: translatedName, desc: translatedDesc }, 'achievement')}
            >
              <Trophy className={clsx("w-8 h-8", {
                "text-yellow-400": ach.unlocked,
                "text-slate-600": !ach.unlocked
              })} />
            </motion.div>
          );
        })}
        </div>
    </div>
  );
}