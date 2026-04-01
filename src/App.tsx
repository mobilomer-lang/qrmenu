/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Menu from './components/Menu';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [view, setView] = useState<'menu' | 'admin'>('menu');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-white transition-colors duration-300">
        <nav className="p-4 bg-white dark:bg-slate-800 shadow-md flex justify-between items-center">
          <h1 className="text-xl font-bold">QR Menü Sistemi</h1>
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
