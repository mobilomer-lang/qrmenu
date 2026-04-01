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
  const [cart, setCart] = useState<any[]>([]);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const [isLoading, setIsLoading] = useState(true);

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
      console.error('Veri çekme hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    socket.on('data-changed', fetchData);
    return () => {
      socket.off('data-changed', fetchData);
    };
  }, []);

  const addToCart = (yemek: any) => {
    if (yemek.aktif === 0) {
      setNotification(`Üzgünüz, ${yemek.ad} şu anda tükendi.`);
      setTimeout(() => setNotification(null), 2000);
      return;
    }
    setCart([...cart, yemek]);
    setNotification(`${yemek.ad} sepete eklendi`);
    setTimeout(() => setNotification(null), 2000);
  };

  const handleCallWaiter = async (masaNo: string) => {
    try {
      await fetch('/api/garson-cagir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masaNo }),
      });
      setNotification('Birazdan garson yanınızda');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Hata:', error);
      alert('Çağrı gönderilemedi.');
    }
  };

  const handleOrder = async (masaNo: string) => {
    try {
      await fetch('/api/siparisler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yemekler: cart.map(y => y.ad),
          masaNo,
          toplamFiyat: cart.reduce((sum, y) => sum + Number(y.fiyat), 0),
        }),
      });
      setCart([]);
      setNotification('Siparişiniz alındı!');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Hata:', error);
      alert('Sipariş gönderilemedi.');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-32 transition-colors duration-300">
      {isLoading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-950 z-50">
          <div className="text-center animate-pulse">
            <Utensils size={48} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yükleniyor...</h1>
          </div>
        </div>
      ) : (
        <>
          {notification && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-green-500 text-white p-6 rounded-2xl shadow-2xl text-center font-bold text-lg animate-bounce">
                {notification}
              </div>
            </div>
          )}
          <style>{`
            .food-card-image {
              width: 120px;
              height: 120px;
              object-fit: cover;
              border-radius: 20px;
            }
          `}</style>
          {/* Header */}
          <header className="flex justify-between items-center p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
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
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Utensils className="text-white" size={20} />
                  </div>
                )}
              </div>
              <h1 className="text-[18px] font-semibold text-black dark:text-white">{ayarlar.uygulamaAdi}</h1>
            </div>
            <button onClick={toggleDarkMode} className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center">
              <Globe className="text-gray-500 dark:text-gray-300" size={20} />
            </button>
          </header>

          {ayarlar.sistemAcik === 0 ? (
            <div className="p-4 text-center text-red-600 dark:text-red-400 font-bold">Restoran şu anda kapalıdır.</div>
          ) : (
            <>
              {/* Kategori Barı */}
              <div className="flex gap-4 overflow-x-auto p-4 pb-6">
                {kategoriler.map(k => {
                  const Icon = (icons as any)[k.iconName] || Utensils;
                  const isActive = aktifKategori === k.ad;
                  return (
                    <button 
                      key={k.id}
                      onClick={() => setAktifKategori(k.ad)}
                      className={`flex flex-col items-center justify-center w-24 h-28 rounded-2xl border transition-all ${
                        isActive 
                          ? 'bg-green-500 text-white border-green-500' 
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl mb-2 ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        <Icon size={24} className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-300'} />
                      </div>
                      <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`}>{k.ad}</span>
                      {isActive && <div className="h-0.5 w-8 bg-white mt-1"></div>}
                    </button>
                  );
                })}
              </div>

              {/* Yemek Listesi */}
              <div className="px-4 space-y-6">
                {yemekler.filter(y => y.kategori === aktifKategori).map(yemek => (
                  <div key={yemek.id} className="relative flex flex-row items-center bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-md overflow-hidden h-32">
                    {/* Sol: Metinler */}
                    <div className="flex-1 flex flex-col justify-center gap-1 pr-4">
                      <h3 className="font-bold text-[16px] text-black dark:text-white">{yemek.ad} {yemek.aktif === 0 && <span className="text-red-500 text-xs ml-2">(Tükendi)</span>}</h3>
                      <p className="text-gray-400 dark:text-gray-400 text-sm line-clamp-2">{yemek.aciklama}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="bg-green-500 text-white font-bold px-4 py-1 rounded-full text-sm w-fit shadow-md">₺{yemek.fiyat},00</span>
                        <button onClick={() => addToCart(yemek)} className={`px-3 py-1 rounded-full text-sm font-semibold ${yemek.aktif === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'}`}>+</button>
                      </div>
                    </div>
                    {/* Sağ: Resim (Oval Kavis Efekti) */}
                    <img 
                      src={yemek.resim || 'https://picsum.photos/seed/food/200/200'} 
                      alt={yemek.ad} 
                      className="food-card-image"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/food/200/200';
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* İşlem Butonları */}
              <div className="fixed bottom-4 left-0 w-full p-4 flex gap-4">
                <button onClick={() => setIsWaiterModalOpen(true)} className="flex-1 bg-gray-800 dark:bg-gray-700 text-white py-3 rounded-full flex items-center justify-center gap-2 font-semibold">
                  <Bell size={20} /> Garson Çağır
                </button>
                <button onClick={() => setIsOrderModalOpen(true)} className="flex-1 bg-green-500 text-white py-3 rounded-full flex items-center justify-center gap-2 font-semibold">
                  <ShoppingCart size={20} /> Sipariş Ver ({cart.length})
                </button>
              </div>
            </>
          )}
          
          <WaiterModal 
            isOpen={isWaiterModalOpen} 
            onClose={() => setIsWaiterModalOpen(false)} 
            onCall={handleCallWaiter} 
          />
          <OrderModal 
            isOpen={isOrderModalOpen} 
            onClose={() => setIsOrderModalOpen(false)} 
            onOrder={handleOrder} 
          />
        </>
      )}
    </div>
  );
}

