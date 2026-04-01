import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io();
import { Salad, Coffee, Pizza, Utensils, Globe, Bell, ShoppingCart } from 'lucide-react';
import WaiterModal from './WaiterModal';
import OrderModal from './OrderModal';

const icons = { Salad, Coffee, Pizza, Utensils, Globe, Bell, ShoppingCart };

interface Kategori {
  id: string;
  ad: string;
  iconName: string;
  sira: number;
}

export default function Menu() {
  const [aktifKategori, setAktifKategori] = useState('');
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [yemekler, setYemekler] = useState<any[]>([]);
  const [ayarlar, setAyarlar] = useState<any>({ uygulamaAdi: 'Green Restaurant', logoUrl: '', sistemAcik: 1 });
  const [cart, setCart] = useState<{ [key: string]: { item: any, quantity: number } }>({});
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    socket.on('data-changed', fetchData);
    return () => socket.off('data-changed', fetchData);
  }, []);

  const fetchData = async () => {
    try {
      const [katRes, yemekRes, ayarlarRes] = await Promise.all([
        fetch('/api/kategoriler').then(r => r.json()),
        fetch('/api/yemekler').then(r => r.json()),
        fetch('/api/ayarlar').then(r => r.json()),
      ]);
      setKategoriler(katRes.sort((a: Kategori, b: Kategori) => a.sira - b.sira));
      if (katRes.length > 0 && !aktifKategori) setAktifKategori(katRes[0].ad);
      setYemekler(yemekRes);
      setAyarlar(ayarlarRes);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = (yemek: any, delta: number) => {
    setCart(prev => {
      const current = prev[yemek.id] || { item: yemek, quantity: 0 };
      const newQuantity = Math.max(0, current.quantity + delta);

      if (newQuantity === 0) {
        const { [yemek.id]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [yemek.id]: { ...current, quantity: newQuantity }
      };
    });
  };

  const cartCount = Object.values(cart).reduce((sum: number, c: any) => sum + c.quantity, 0);

  return (
    <div className="min-h-screen bg-white pb-32">

      {/* GÖRSEL STYLE */}
      <style>{`
        .food-card-image {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 18px;
          position: absolute;
          right: 12px;
          top: 12px;
          box-shadow: 0 6px 16px rgba(0,0,0,0.15);
        }
      `}</style>

      {/* Yemek Listesi */}
      <div className="px-4 space-y-5">
        {yemekler.filter(y => y.kategori === aktifKategori).map(yemek => {
          const quantity = cart[yemek.id]?.quantity || 0;

          return (
            <div
              key={yemek.id}
              className="relative bg-white p-4 rounded-3xl shadow-md overflow-hidden min-h-[120px]"
            >
              
              {/* SOL ALAN */}
              <div className="flex flex-col gap-1 pr-[120px]">
                <h3 className="font-bold text-[16px]">
                  {yemek.ad}
                </h3>

                <p className="text-gray-400 text-sm line-clamp-2">
                  {yemek.aciklama}
                </p>

                <div className="flex items-center justify-between mt-2">
                  
                  <span className="bg-green-500 text-white font-bold px-4 py-1 rounded-full text-sm">
                    ₺{yemek.fiyat},00
                  </span>

                  <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
                    {quantity > 0 && (
                      <>
                        <button onClick={() => updateQuantity(yemek, -1)}>-</button>
                        <span>{quantity}</span>
                      </>
                    )}
                    <button onClick={() => updateQuantity(yemek, 1)}>+</button>
                  </div>

                </div>
              </div>

              {/* SAĞ GÖRSEL */}
              <img
                src={yemek.resim || 'https://picsum.photos/200'}
                className="food-card-image"
              />
            </div>
          );
        })}
      </div>

      {/* ALT BAR */}
      <div className="fixed bottom-4 left-0 w-full p-4 flex gap-4">
        <button className="flex-1 bg-gray-800 text-white py-3 rounded-full">
          Garson Çağır
        </button>
        <button className="flex-1 bg-green-500 text-white py-3 rounded-full">
          Sipariş Ver ({cartCount})
        </button>
      </div>

    </div>
  );
}
