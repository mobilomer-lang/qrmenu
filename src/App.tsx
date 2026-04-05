/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Menu from './components/Menu';
import AdminPanel from './components/AdminPanel';
import { Utensils, Globe } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';

export default function App() {
  const [view, setView] = useState<'menu' | 'admin'>('menu');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [ayarlar, setAyarlar] = useState<any>({ uygulamaAdi: 'Yükleniyor...', logoUrl: '' });
  const { language, setLanguage, t, isRTL, languages } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isLangOpen && !(event.target as HTMLElement).closest('.lang-selector')) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLangOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => {
    fetch('/api/ayarlar')
      .then(r => r.json())
      .then(data => setAyarlar(data))
      .catch(err => console.error('Ayarlar yüklenemedi:', err));
  }, []);

  const uygulamaAdi = ayarlar[`uygulamaAdi_${language}`] || ayarlar.uygulamaAdi;

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-white transition-colors duration-300">
        <nav className="p-4 bg-white dark:bg-slate-800 shadow-md flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-[60px] h-[60px] flex items-center justify-center overflow-hidden">
              {ayarlar.logoUrl ? (
                <img 
                  src={ayarlar.logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.png';
                  }}
                />
              ) : (
                <div className="w-[60px] h-[60px] bg-green-500 rounded-full flex items-center justify-center">
                  <Utensils className="text-white" size={32} />
                </div>
              )}
            </div>
            <h1 className="text-xl font-bold">{uygulamaAdi}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative lang-selector">
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                {languages.find(l => l.kod === language)?.bayrak ? (
                  <img 
                    src={languages.find(l => l.kod === language)?.bayrak} 
                    alt={language} 
                    className="w-6 h-4 object-cover rounded-sm shadow-sm"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent && !parent.querySelector('.fallback-icon')) {
                        const span = document.createElement('span');
                        span.className = 'fallback-icon text-lg';
                        span.innerText = '🌐';
                        parent.prepend(span);
                      }
                    }}
                  />
                ) : (
                  <span className="text-lg">🌐</span>
                )}
                <span className="text-sm font-bold uppercase">{language}</span>
              </button>
              
              {isLangOpen && (
                <div className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-gray-100 dark:border-slate-700 py-2 min-w-[140px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {languages.filter(l => l.aktif === 1).map(l => (
                    <button
                      key={l.kod}
                      onClick={() => {
                        setLanguage(l.kod);
                        setIsLangOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${language === l.kod ? 'text-green-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      <img 
                        src={l.bayrak} 
                        alt={l.ad} 
                        className="w-6 h-4 object-cover rounded-sm shadow-sm"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent && !parent.querySelector('.fallback-icon')) {
                            const span = document.createElement('span');
                            span.className = 'fallback-icon text-lg';
                            span.innerText = '🌐';
                            parent.prepend(span);
                          }
                        }}
                      />
                      <span>{l.ad}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => setView(view === 'menu' ? 'admin' : 'menu')}
              className={`px-4 py-2 rounded-md ${theme === 'dark' ? 'bg-orange-500' : 'bg-green-500'} text-white font-medium`}
            >
              {view === 'menu' ? t('admin.dashboard') : t('menu.categories')}
            </button>
          </div>
        </nav>
        <main>
          {view === 'menu' ? <Menu /> : <AdminPanel />}
        </main>
      </div>
    </div>
  );
}
