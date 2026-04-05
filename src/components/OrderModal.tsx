import { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import PriceDisplay from './PriceDisplay';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrder: (masaNo: string) => Promise<void>;
  cart: { [key: string]: { item: any, quantity: number } };
  updateQuantity: (yemek: any, delta: number) => void;
}

export default function OrderModal({ isOpen, onClose, onOrder, cart, updateQuantity }: OrderModalProps) {
  const { t, language } = useLanguage();
  const [masaNo, setMasaNo] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const cartItems = Object.values(cart);
  const total = cartItems.reduce((sum, c) => sum + (Number(c.item.fiyat) * c.quantity), 0);

  const handleSubmit = async () => {
    if (!masaNo || cartItems.length === 0) return;
    setLoading(true);
    await onOrder(masaNo);
    setLoading(false);
    setMasaNo('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold dark:text-white">{t('menu.orderSummary')}</h3>
          <button onClick={onClose} className="dark:text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-1">
          {cartItems.length === 0 ? (
            <p className="text-center text-gray-500 py-4">{t('menu.emptyCart')}.</p>
          ) : (
            cartItems.map(({ item, quantity }) => (
              <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl">
                <div className="flex-1">
                  <p className="font-bold text-sm dark:text-white">{item[`ad_${language}`] || item.ad}</p>
                  <PriceDisplay price={item.fiyat * quantity} className="!gap-1" />
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-gray-700 rounded-full px-2 py-1 shadow-sm">
                  <button 
                    onClick={() => updateQuantity(item, -1)} 
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-white font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold dark:text-white min-w-[20px] text-center">{quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item, 1)} 
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-white font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500 dark:text-gray-400 font-medium">{t('menu.totalAmount')}:</span>
            <PriceDisplay price={total} className="text-xl" />
          </div>
          <input
            type="text"
            value={masaNo}
            onChange={(e) => setMasaNo(e.target.value)}
            placeholder={t('menu.enterTableNo')}
            className="w-full p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl mb-4 focus:ring-2 focus:ring-green-500 outline-none transition-all"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !masaNo || cartItems.length === 0}
            className="w-full bg-green-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-500/30 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {loading ? t('menu.ordering') : t('menu.checkout')}
          </button>
        </div>
      </div>
    </div>
  );
}
