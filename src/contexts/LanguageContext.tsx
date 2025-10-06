"use client";

import { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Suponiendo que tendrás estos archivos JSON en tu proyecto
import es from '@/locales/es.json';
import en from '@/locales/en.json';

export type Language = 'es' | 'en';

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translations: { [key: string]: any } = { es, en };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('es');

    useEffect(() => {
        const savedLang = localStorage.getItem('world-idle-lang') as Language;
        if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
            setLanguage(savedLang);
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('world-idle-lang', lang);
    };

    const t = useCallback((key: string, replacements?: { [key: string]: string | number }): string => {
        const keys = key.split('.');
        let translation = translations[language];
        for (const k of keys) {
            translation = translation?.[k];
            if (translation === undefined) {
                return key;
            }
        }

        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                translation = translation.replace(`{${rKey}}`, String(replacements[rKey]));
            });
        }

        return translation || key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
