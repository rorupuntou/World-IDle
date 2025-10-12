"use client";

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSelector() {
    const { language, setLanguage } = useLanguage();

    const toggleLanguage = () => {
        const newLang = language === 'es' ? 'en' : 'es';
        setLanguage(newLang);
    };

    return (
        <div className="fixed top-4 right-4 z-50">
            <button 
                onClick={toggleLanguage}
                className="bg-slate-500/20 hover:bg-slate-500/40 text-white font-bold py-2 px-4 rounded-lg"
            >
                {language.toUpperCase()}
            </button>
        </div>
    );
}
