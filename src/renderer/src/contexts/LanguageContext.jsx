import React, { createContext, useState, useContext, useEffect } from 'react';
import en from '../locales/en';
import th from '../locales/th';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'th';
  });

  const [t, setT] = useState(language === 'en' ? en : th);

  useEffect(() => {
    const translations = language === 'en' ? en : th;
    setT(translations);
    localStorage.setItem('appLanguage', language);
    
    // Notify Main Process for Discord RPC updates
    if (window.api && window.api.updateLanguage) {
        window.api.updateLanguage(language);
    }
  }, [language]);

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  // Helper to access nested keys like t('sidebar.home')
  const translate = (key) => {
    const keys = key.split('.');
    let value = t;
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // Fallback to key if not found
      }
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t: translate, rawT: t }}>
      {children}
    </LanguageContext.Provider>
  );
};
