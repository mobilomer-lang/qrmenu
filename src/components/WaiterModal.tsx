import { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface WaiterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCall: (masaNo: string) => Promise<void>;
}

export default function WaiterModal({ isOpen, onClose, onCall }: WaiterModalProps) {
  const { t } = useLanguage();
  const [masaNo, setMasaNo] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!masaNo) return;
    setLoading(true);
    await onCall(masaNo);
    setLoading(false);
    setMasaNo('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold dark:text-white">{t('menu.callWaiter')}</h3>
          <button onClick={onClose} className="dark:text-white"><X size={20} /></button>
        </div>
        <input
          type="text"
          value={masaNo}
          onChange={(e) => setMasaNo(e.target.value)}
          placeholder={t('menu.enterTableNo')}
          className="w-full p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl mb-4"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !masaNo}
          className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? t('menu.calling') : t('menu.call')}
        </button>
      </div>
    </div>
  );
}
