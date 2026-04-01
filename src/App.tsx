/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Menu from './components/Menu';
import AdminPanel from './components/AdminPanel';
import { Utensils } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'menu' | 'admin'>('menu');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [ayarlar, setAyarlar] = useState<any>({ uygulamaAdi: 'Yükleniyor...', logoUrl: '' });

  useEffect(() => {
    fetch('/api/ayarlar')
      .then(r => r.json())
      .then(data => setAyarlar(data))
      .catch(err => console.error('Ayarlar yüklenemedi:', err));
  }, []);

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
            <h1 className="text-xl font-bold">{ayarlar.uygulamaAdi}</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-md"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button 
              onClick={() => setView(view === 'menu' ? 'admin' : 'menu')}
              className={`px-4 py-2 rounded-md ${theme === 'dark' ? 'bg-orange-500' : 'bg-green-500'} text-white`}
            >
              {view === 'menu' ? 'Admin' : 'Menü'}
            </button>
          </div>
        </nav>
        <main>
          {view === 'menu' ? <Menu theme={theme} /> : <AdminPanel />}
        </main>
      </div>
    </div>
  );
}
