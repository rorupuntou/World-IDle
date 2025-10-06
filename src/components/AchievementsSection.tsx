"use client";

import { motion } from "framer-motion";
import { TrophyIcon } from '@heroicons/react/24/outline';
import { Achievement, Requirement } from "@/components/types";

interface AchievementsSectionProps {
  achievements: Achievement[];
  showRequirements: (item: Achievement, itemType: 'achievement') => void;
}

export default function AchievementsSection({ achievements, showRequirements }: AchievementsSectionProps) {
  return (
    <div className="bg-slate-500/10 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><TrophyIcon className="w-6 h-6"/>Logros</h3>
        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3">
        {achievements.map((ach) => {
          if (ach.type === 'shadow' && !ach.unlocked) return null;
          return (
          <motion.div 
            key={ach.id} 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className={`aspect-square flex justify-center items-center bg-slate-500/10 rounded-lg border border-slate-700 transition-opacity cursor-pointer ${ach.unlocked ? 'opacity-100' : 'opacity-20'}`} 
            title={ach.unlocked ? `${ach.name} - ${ach.desc}`: ach.name}
            onClick={() => showRequirements(ach, 'achievement')}
          >
            <div className="text-3xl">{ach.unlocked ? '🏆' : '🔒'}</div>
          </motion.div>
        );})}
        </div>
    </div>
  );
}