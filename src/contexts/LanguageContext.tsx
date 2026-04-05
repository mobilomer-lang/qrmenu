import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageInfo {
  id: number;
  kod: string;
  ad: string;
  bayrak: string;
  aktif: number;
  rtl: number;
}

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
  isRTL: boolean;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date) => string;
  languages: LanguageInfo[];
  exchangeRates: any;
  convertPrice: (amount: number, targetCurrency: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const locales: Record<string, any> = {
  tr: {},
  en: {},
  ar: {},
  de: {}
};

// Initial load of locales (we'll fetch them or import them)
import tr from '../locales/tr.json';
import en from '../locales/en.json';
import ar from '../locales/ar.json';
import de from '../locales/de.json';

locales.tr = tr;
locales.en = en;
locales.ar = ar;
locales.de = de;

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    const saved = localStorage.getItem('app_language');
    return saved || 'tr';
  });

  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [exchangeRates, setExchangeRates] = useState<any>(null);

  useEffect(() => {
    fetch('/api/diller')
      .then(r => r.json())
      .then(data => setLanguages(data))
      .catch(err => console.error('Diller yüklenemedi:', err));

    fetch('/api/exchange-rates')
      .then(r => r.json())
      .then(data => setExchangeRates(data))
      .catch(err => console.error('Döviz kurları yüklenemedi:', err));
  }, []);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const isRTL = languages.find(l => l.kod === language)?.rtl === 1;

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value = locales[language as any];
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        // Fallback to English if key not found in current language
        let fallbackValue = locales['en'];
        for (const fk of keys) {
          if (fallbackValue && fallbackValue[fk]) {
            fallbackValue = fallbackValue[fk];
          } else {
            return key; // Return key if not found in fallback either
          }
        }
        return fallbackValue;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const formatCurrency = (amount: number, currencyCode?: string, localeCode?: string) => {
    const localesMap: Record<string, string> = {
      tr: 'tr-TR',
      en: 'en-US',
      ar: 'ar-SA',
      de: 'de-DE'
    };
    const currenciesMap: Record<string, string> = {
      tr: 'TRY',
      en: 'USD',
      ar: 'SAR',
      de: 'EUR'
    };

    return new Intl.NumberFormat(localeCode || localesMap[language] || 'en-US', {
      style: 'currency',
      currency: currencyCode || currenciesMap[language] || 'USD',
    }).format(amount);
  };

  const convertPrice = (amount: number, targetCurrency: string) => {
    if (!exchangeRates || !exchangeRates.rates || !exchangeRates.rates[targetCurrency]) {
      return '';
    }
    const converted = amount * exchangeRates.rates[targetCurrency];
    
    // Map currency to locale for formatting
    const localeMap: Record<string, string> = {
      'USD': 'en-US',
      'EUR': 'de-DE',
      'SAR': 'ar-SA',
      'TRY': 'tr-TR'
    };

    return new Intl.NumberFormat(localeMap[targetCurrency] || 'en-US', {
      style: 'currency',
      currency: targetCurrency,
    }).format(converted);
  };

  const formatDate = (date: string | Date) => {
    const localesMap: Record<string, string> = {
      tr: 'tr-TR',
      en: 'en-US',
      ar: 'ar-SA',
      de: 'de-DE'
    };
    return new Intl.DateTimeFormat(localesMap[language] || 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(date));
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, formatCurrency, formatDate, languages, exchangeRates, convertPrice }}>
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
