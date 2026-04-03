import { useEffect, useState } from 'react';
import { Utensils, ClipboardList, LayoutGrid, Trash2, Bell, Pencil } from 'lucide-react';
import IconPicker from './IconPicker';
import { io } from 'socket.io-client';

const socket = io();

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'yemekler' | 'kategoriler' | 'siparisler' | 'ayarlar'>('yemekler');
  const [ayarlar, setAyarlar] = useState<any>({ uygulamaAdi: '', logoUrl: '', sistemAcik: 1 });
  const [yeniLogoFile, setYeniLogoFile] = useState<File | null>(null);

  const [kategoriler, setKategoriler] = useState<any[]>([]);
  const [yeniKategoriAd, setYeniKategoriAd] = useState('');
  const [yeniKategoriIcon, setYeniKategoriIcon] = useState('Utensils');
  const [yeniKategoriSira, setYeniKategoriSira] = useState(0);
  const [duzenlenenKategori, setDuzenlenenKategori] = useState<any>(null);
  
  const [yemekler, setYemekler] = useState<any[]>([]);
  const [yeniYemekAd, setYeniYemekAd] = useState('');
  const [yeniYemekFiyat, setYeniYemekFiyat] = useState('');
  const [yeniYemekAciklama, setYeniYemekAciklama] = useState('');
  const [yeniYemekResim, setYeniYemekResim] = useState('');
  const [yeniYemekResimFile, setYeniYemekResimFile] = useState<File | null>(null);
  const [yeniYemekKategori, setYeniYemekKategori] = useState('');
  const [yeniYemekAktif, setYeniYemekAktif] = useState(true);
  const [duzenlenenYemek, setDuzenlenenYemek] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResimYukle = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Yükleme başarısız');
      return data.url;
    } catch (error: any) {
      console.error('Resim yükleme hatası:', error);
      alert('Resim yüklenemedi: ' + error.message);
      throw error;
    }
  };

  const [duzenlenenSiparis, setDuzenlenenSiparis] = useState<any>(null);
  const [siparisler, setSiparisler] = useState<any[]>([]);
  const [cagrilar, setCagrilar] = useState<any[]>([]);
  const [tamamlananCagrilar, setTamamlananCagrilar] = useState<any[]>([]);
  const [eklenecekAdet, setEklenecekAdet] = useState(1);

  const [currentPageYemekler, setCurrentPageYemekler] = useState(1);
  const [currentPageSiparisler, setCurrentPageSiparisler] = useState(1);
  const [currentPageEskiCagrilar, setCurrentPageEskiCagrilar] = useState(1);
  const itemsPerPage = 10;
  const itemsPerPageEskiCagrilar = 5;

  const safeParseYemekler = (yemekler: any) => {
    if (!yemekler) return [];
    if (typeof yemekler === 'string') {
      try {
        const parsed = JSON.parse(yemekler);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(yemekler) ? yemekler : [];
  };

  const consolidateItems = (items: any[]) => {
    const map: { [key: string]: number } = {};
    items.forEach(item => {
      if (typeof item !== 'string') return;
      const match = item.match(/^(\d+)x\s+(.*)$/);
      if (match) {
        const qty = parseInt(match[1]);
        const name = match[2];
        map[name] = (map[name] || 0) + qty;
      } else {
        map[item] = (map[item] || 0) + 1;
      }
    });
    return Object.entries(map).map(([name, qty]) => `${qty}x ${name}`);
  };

  const handleSiparisDurumGuncelle = async (id: string, durum: string) => {
    await fetch(`/api/siparisler/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify({ durum }), 
      headers: { 'Content-Type': 'application/json' } 
    });
    fetchData();
    setSuccessMessage('Sipariş durumu güncellendi!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const fetchData = async () => {
    try {
      const [katRes, yemekRes, sipRes, cagriRes, ayarlarRes, tamamlananCagriRes] = await Promise.all([
        fetch('/api/kategoriler').then(r => r.ok ? r.json() : Promise.reject('Kategoriler çekilemedi')),
        fetch('/api/yemekler').then(r => r.ok ? r.json() : Promise.reject('Yemekler çekilemedi')),
        fetch('/api/siparisler').then(r => r.ok ? r.json() : Promise.reject('Siparişler çekilemedi')),
        fetch('/api/cagrilar').then(r => r.ok ? r.json() : Promise.reject('Çağrılar çekilemedi')),
        fetch('/api/ayarlar').then(r => r.ok ? r.json() : Promise.reject('Ayarlar çekilemedi')),
        fetch('/api/cagrilar/tamamlanan').then(r => r.ok ? r.json() : Promise.reject('Tamamlanan çağrılar çekilemedi')),
      ]);
      setKategoriler(katRes);
      setYemekler(yemekRes);
      const sortedSiparisler = [...sipRes].sort((a: any, b: any) => {
        if (a.durum === 'Bekliyor' && b.durum !== 'Bekliyor') return -1;
        if (a.durum !== 'Bekliyor' && b.durum === 'Bekliyor') return 1;
        return b.id - a.id;
      });
      setSiparisler(sortedSiparisler);
      setCagrilar(cagriRes);
      setTamamlananCagrilar(tamamlananCagriRes);
      setAyarlar(ayarlarRes);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    }
  };

  useEffect(() => {
    fetchData();
    socket.on('data-changed', fetchData);
    socket.on('garson-cagir', fetchData);
    return () => {
      socket.off('data-changed', fetchData);
      socket.off('garson-cagir', fetchData);
    };
  }, []);

  const handleTamamla = async (id: string) => {
    await fetch(`/api/cagrilar/${id}`, { method: 'PUT', body: JSON.stringify({ durum: 'Tamamlandı' }), headers: { 'Content-Type': 'application/json' } });
    fetchData();
    setSuccessMessage('Çağrı tamamlandı!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleKategoriKaydet = async () => {
    if (duzenlenenKategori) {
      await fetch(`/api/kategoriler/${duzenlenenKategori.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: yeniKategoriAd, iconName: yeniKategoriIcon, sira: Number(yeniKategoriSira) }),
      });
      setDuzenlenenKategori(null);
      setSuccessMessage('Kategori güncellendi!');
    } else if (yeniKategoriAd) {
      await fetch('/api/kategoriler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: yeniKategoriAd, iconName: yeniKategoriIcon, sira: Number(yeniKategoriSira) }),
      });
      setSuccessMessage('Kategori eklendi!');
    }
    setTimeout(() => setSuccessMessage(null), 3000);
    setYeniKategoriAd('');
    setYeniKategoriIcon('Utensils');
    setYeniKategoriSira(0);
    fetchData();
  };

  const handleKategoriSil = async (id: string) => {
    await fetch(`/api/kategoriler/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleDuzenle = (k: any) => {
    setDuzenlenenKategori(k);
    setYeniKategoriAd(k.ad);
    setYeniKategoriIcon(k.iconName || 'Utensils');
    setYeniKategoriSira(k.sira || 0);
  };

  const handleYemekKaydet = async () => {
    let resimUrl = yeniYemekResim;
    if (yeniYemekResimFile) {
      resimUrl = await handleResimYukle(yeniYemekResimFile);
    }
    
    if (duzenlenenYemek) {
      await fetch(`/api/yemekler/${duzenlenenYemek.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: yeniYemekAd, fiyat: Number(yeniYemekFiyat), aciklama: yeniYemekAciklama, resim: resimUrl, kategori: yeniYemekKategori, aktif: yeniYemekAktif }),
      });
      setDuzenlenenYemek(null);
    } else if (yeniYemekAd) {
      await fetch('/api/yemekler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: yeniYemekAd, fiyat: Number(yeniYemekFiyat), aciklama: yeniYemekAciklama, resim: resimUrl, kategori: yeniYemekKategori, aktif: yeniYemekAktif }),
      });
    }
    setYeniYemekAd('');
    setYeniYemekFiyat('');
    setYeniYemekAciklama('');
    setYeniYemekResim('');
    setYeniYemekResimFile(null);
    setYeniYemekKategori('');
    setYeniYemekAktif(true);
    fetchData();
    setSuccessMessage('İşlem tamamlandı!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleYemekSil = async (id: string) => {
    await fetch(`/api/yemekler/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleYemekDuzenle = (y: any) => {
    setDuzenlenenYemek(y);
    setYeniYemekAd(y.ad);
    setYeniYemekFiyat(y.fiyat);
    setYeniYemekAciklama(y.aciklama);
    setYeniYemekResim(y.resim);
    setYeniYemekKategori(y.kategori);
    setYeniYemekAktif(!!y.aktif);
  };

  const handleYemekToggle = async (y: any) => {
    await fetch(`/api/yemekler/${y.id}`, { method: 'PUT', body: JSON.stringify({ aktif: !y.aktif }), headers: { 'Content-Type': 'application/json' } });
    fetchData();
  };

  const Toggle = ({ enabled, onChange, label }: { enabled: boolean, onChange: () => void, label: string }) => (
    <div className="flex items-center justify-between gap-2 w-full">
      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">{label}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );

  const menuItems = [
    { name: 'Yemekler', desc: 'Menüleri Yönet', icon: Utensils, tab: 'yemekler' },
    { name: 'Kategoriler', desc: 'Kategori Düzenle', icon: LayoutGrid, tab: 'kategoriler' },
    { name: 'Siparişler', desc: 'Son Sipariş Durumları', icon: ClipboardList, tab: 'siparisler' },
    { name: 'Ayarlar', desc: 'Uygulama Ayarları', icon: Bell, tab: 'ayarlar' },
  ];

  const handleAyarlarKaydet = async () => {
    let logoUrl = ayarlar.logoUrl;
    if (yeniLogoFile) {
      logoUrl = await handleResimYukle(yeniLogoFile);
    }
    await fetch('/api/ayarlar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ayarlar, logoUrl }),
    });
    fetchData();
  };

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-950 min-h-screen w-full overflow-x-hidden transition-colors duration-300">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Süper Admin Paneli</h2>
      
      {successMessage && (
        <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 p-3 rounded-lg mb-4 text-sm font-medium">
          {successMessage}
        </div>
      )}
      
      {/* Garson Çağrıları - Her zaman görünür */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4 w-full">
        <div className="flex gap-4 border-b border-gray-100 dark:border-gray-800 mb-3">
          <button 
            onClick={() => setActiveTab('yemekler')} // Reset to some tab if needed, but let's just use local state for calls
            className={`pb-2 text-sm font-bold flex items-center gap-2 ${activeTab !== 'ayarlar' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-400 dark:text-gray-500'}`}
          >
            <Bell size={16} /> Bekleyen Çağrılar ({cagrilar.length})
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border-r border-gray-100 dark:border-gray-800 pr-4">
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">Bekleyenler</h4>
            <div className="space-y-2">
              {cagrilar.length === 0 ? <p className="text-xs text-gray-400 dark:text-gray-500 italic">Bekleyen çağrı yok.</p> : cagrilar.map((cagri) => (
                <div key={cagri.id} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex justify-between items-center text-sm">
                  <span className="font-medium text-red-700 dark:text-red-400">Masa: {cagri.masaNo}</span>
                  <button onClick={() => handleTamamla(cagri.id)} className="bg-green-500 text-white px-2 py-1 rounded text-[10px] font-bold">Tamamla</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">Eski Çağrılar</h4>
            <div className="space-y-2">
              {tamamlananCagrilar.length === 0 ? <p className="text-xs text-gray-400 dark:text-gray-500 italic">Eski çağrı yok.</p> : tamamlananCagrilar.slice((currentPageEskiCagrilar - 1) * itemsPerPageEskiCagrilar, currentPageEskiCagrilar * itemsPerPageEskiCagrilar).map((cagri) => (
                <div key={cagri.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Masa: {cagri.masaNo}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(cagri.olusturuldu).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              ))}
            </div>
            {/* Eski Çağrılar Sayfalandırma */}
            {tamamlananCagrilar.length > itemsPerPageEskiCagrilar && (
              <div className="flex justify-center gap-1 mt-2">
                <button 
                  disabled={currentPageEskiCagrilar === 1} 
                  onClick={() => setCurrentPageEskiCagrilar(prev => prev - 1)}
                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded text-[10px] disabled:opacity-50"
                >
                  &lt;
                </button>
                <span className="text-[10px] flex items-center">{currentPageEskiCagrilar} / {Math.ceil(tamamlananCagrilar.length / itemsPerPageEskiCagrilar)}</span>
                <button 
                  disabled={currentPageEskiCagrilar === Math.ceil(tamamlananCagrilar.length / itemsPerPageEskiCagrilar)} 
                  onClick={() => setCurrentPageEskiCagrilar(prev => prev + 1)}
                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded text-[10px] disabled:opacity-50"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Tasarımı */}
      <div className="grid grid-cols-2 gap-3 mb-4 w-full">
        {menuItems.map((item, i) => (
          <button key={i} onClick={() => setActiveTab(item.tab as any)} className="bg-white dark:bg-gray-900 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-1 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
              <item.icon size={20} />
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white text-xs">{item.name}</h4>
          </button>
        ))}
      </div>

      {/* Tab İçerikleri */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 w-full">
        {activeTab === 'yemekler' && (
          <>
            <h3 className="text-sm font-bold mb-2 dark:text-white">{duzenlenenYemek ? 'Yemek Düzenle' : 'Yemek Ekle'}</h3>
            <div className="space-y-2 mb-3">
              <input value={yeniYemekAd} onChange={e => setYeniYemekAd(e.target.value)} placeholder="Yemek Adı" className="border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm w-full bg-white dark:bg-gray-800 dark:text-white" />
              <input type="number" value={yeniYemekFiyat} onChange={e => setYeniYemekFiyat(e.target.value)} placeholder="Fiyat" className="border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm w-full bg-white dark:bg-gray-800 dark:text-white" />
              <input value={yeniYemekAciklama} onChange={e => setYeniYemekAciklama(e.target.value)} placeholder="Açıklama" className="border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm w-full bg-white dark:bg-gray-800 dark:text-white" />
              <input value={yeniYemekResim} onChange={e => setYeniYemekResim(e.target.value)} placeholder="Resim URL" className="border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm w-full bg-white dark:bg-gray-800 dark:text-white" />
              <input type="file" onChange={e => setYeniYemekResimFile(e.target.files?.[0] || null)} className="border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm w-full bg-white dark:bg-gray-800 dark:text-white" />
              <select value={yeniYemekKategori} onChange={e => setYeniYemekKategori(e.target.value)} className="border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm w-full bg-white dark:bg-gray-800 dark:text-white">
                <option value="">Kategori Seç</option>
                {kategoriler.map(k => <option key={k.id} value={k.ad}>{k.ad}</option>)}
              </select>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                  <input type="checkbox" checked={yeniYemekAktif} onChange={e => setYeniYemekAktif(e.target.checked)} />
                  Aktif
                </label>
              </div>
              <button onClick={handleYemekKaydet} className="bg-green-600 text-white px-3 py-2 rounded-lg w-full text-sm">
                {duzenlenenYemek ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
            <div className="space-y-2">
              {yemekler.slice((currentPageYemekler - 1) * itemsPerPage, currentPageYemekler * itemsPerPage).map(y => (
                <div key={y.id} className="flex justify-between items-center p-2 border-b border-gray-50 dark:border-gray-800 text-sm">
                  <div className="flex items-center gap-2">
                    {y.resim && (
                      <img 
                        src={y.resim} 
                        alt={y.ad} 
                        className="w-10 h-10 rounded-lg object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/food/100/100';
                        }}
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-200">{y.ad}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{y.fiyat} TL - {y.aktif ? 'Açık' : 'Kapalı'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1 min-w-[80px]">
                      <Toggle enabled={!!y.aktif} onChange={() => handleYemekToggle(y)} label="Aktif" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleYemekDuzenle(y)} className="text-blue-500" title="Düzenle">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleYemekSil(y.id)} className="text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Yemek Sayfalandırma */}
            {yemekler.length > itemsPerPage && (
              <div className="flex justify-center gap-2 mt-4">
                <button 
                  disabled={currentPageYemekler === 1} 
                  onClick={() => setCurrentPageYemekler(prev => prev - 1)}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded-lg text-xs disabled:opacity-50"
                >
                  Geri
                </button>
                <span className="text-xs flex items-center dark:text-gray-300">{currentPageYemekler} / {Math.ceil(yemekler.length / itemsPerPage)}</span>
                <button 
                  disabled={currentPageYemekler === Math.ceil(yemekler.length / itemsPerPage)} 
                  onClick={() => setCurrentPageYemekler(prev => prev + 1)}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded-lg text-xs disabled:opacity-50"
                >
                  İleri
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'kategoriler' && (
          <>
            <h3 className="text-sm font-bold mb-2 dark:text-white">{duzenlenenKategori ? 'Kategori Düzenle' : 'Kategori Ekle'}</h3>
            <div className="space-y-2 mb-3">
              <input 
                value={yeniKategoriAd} 
                onChange={e => setYeniKategoriAd(e.target.value)}
                placeholder="Kategori Adı"
                className="border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm w-full bg-white dark:bg-gray-800 dark:text-white"
              />
              <div className="flex gap-2">
                <IconPicker selectedIcon={yeniKategoriIcon} onSelect={setYeniKategoriIcon} />
                <input 
                  type="number"
                  value={yeniKategoriSira} 
                  onChange={e => setYeniKategoriSira(Number(e.target.value))}
                  placeholder="Sıra"
                  className="border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm w-20 bg-white dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button onClick={handleKategoriKaydet} className="bg-green-600 text-white px-3 py-2 rounded-lg w-full text-sm">
                {duzenlenenKategori ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
            <div className="space-y-2">
              {kategoriler.map(k => (
                <div key={k.id} className="flex justify-between items-center p-2 border-b border-gray-50 dark:border-gray-800 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">{k.sira}. {k.ad}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleDuzenle(k)} className="text-blue-500">Düzenle</button>
                    <button onClick={() => handleKategoriSil(k.id)} className="text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'siparisler' && (
          <>
            <h3 className="text-sm font-bold mb-2 dark:text-white">Müşteri Siparişleri</h3>
            {siparisler.length === 0 ? <p className="text-xs text-gray-500 dark:text-gray-400">Henüz sipariş yok.</p> : (
              <>
                {siparisler.slice((currentPageSiparisler - 1) * itemsPerPage, currentPageSiparisler * itemsPerPage).map(s => (
                  <div 
                    key={s.id} 
                    className={`p-3 border-b border-gray-100 dark:border-gray-800 text-sm cursor-pointer transition-colors ${
                      s.durum === 'Tamamlandı' 
                        ? 'bg-green-100/60 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30' 
                        : 'bg-red-100/60 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30'
                    }`} 
                    onClick={() => {
                      const consolidated = consolidateItems(safeParseYemekler(s.yemekler));
                      setDuzenlenenSiparis({ ...s, yemekler: consolidated });
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-white">Masa: {s.masaNo}</span>
                        <span className="text-green-600 font-bold text-xs">Masa Hesabı: ₺{s.toplamFiyat},00</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${s.durum === 'Tamamlandı' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.durum || 'Bekliyor'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">Sipariş Detayları</span>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Sipariş Sayfalandırma */}
                {siparisler.length > itemsPerPage && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button 
                      disabled={currentPageSiparisler === 1} 
                      onClick={() => setCurrentPageSiparisler(prev => prev - 1)}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded-lg text-xs disabled:opacity-50"
                    >
                      Geri
                    </button>
                    <span className="text-xs flex items-center dark:text-gray-300">{currentPageSiparisler} / {Math.ceil(siparisler.length / itemsPerPage)}</span>
                    <button 
                      disabled={currentPageSiparisler === Math.ceil(siparisler.length / itemsPerPage)} 
                      onClick={() => setCurrentPageSiparisler(prev => prev + 1)}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded-lg text-xs disabled:opacity-50"
                    >
                      İleri
                    </button>
                  </div>
                )}
              </>
            )}
            
            {duzenlenenSiparis && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl w-full max-w-sm border border-gray-100 dark:border-gray-800">
                  <h3 className="font-bold mb-2 dark:text-white">Sipariş Düzenle</h3>
                  <input 
                    value={duzenlenenSiparis.masaNo} 
                    onChange={e => setDuzenlenenSiparis({...duzenlenenSiparis, masaNo: e.target.value})} 
                    className="border border-gray-200 dark:border-gray-700 p-2 rounded w-full mb-2 bg-white dark:bg-gray-800 dark:text-white" 
                    placeholder="Masa No" 
                  />
                    <div className="mb-4">
                      <p className="text-xs font-bold mb-2 dark:text-white">Ürünler:</p>
                      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                        {safeParseYemekler(duzenlenenSiparis.yemekler).map((y: string, i: number) => {
                          const quantity = y.includes('x ') ? parseInt(y.split('x ')[0]) : 1;
                          const itemName = y.includes('x ') ? y.split('x ')[1] : y;
                          const urun = yemekler.find(yemek => yemek.ad === itemName);

                          const updateItemQty = (delta: number) => {
                            const newQty = Math.max(0, quantity + delta);
                            const mevcutUrunler = safeParseYemekler(duzenlenenSiparis.yemekler);
                            let yeniUrunler;
                            let yeniFiyat = duzenlenenSiparis.toplamFiyat;

                            if (newQty === 0) {
                              yeniUrunler = mevcutUrunler.filter((_: any, index: number) => index !== i);
                              yeniFiyat = Math.max(0, yeniFiyat - (urun?.fiyat || 0));
                            } else {
                              yeniUrunler = [...mevcutUrunler];
                              yeniUrunler[i] = `${newQty}x ${itemName}`;
                              yeniFiyat = yeniFiyat + (delta * (urun?.fiyat || 0));
                            }

                            setDuzenlenenSiparis({
                              ...duzenlenenSiparis,
                              yemekler: yeniUrunler,
                              toplamFiyat: yeniFiyat
                            });
                          };

                          return (
                            <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden">
                                  <button 
                                    onClick={() => updateItemQty(-1)}
                                    className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold border-r border-gray-200 dark:border-gray-600"
                                  >-</button>
                                  <span className="px-2 py-1 text-xs font-bold dark:text-white min-w-[24px] text-center">{quantity}</span>
                                  <button 
                                    onClick={() => updateItemQty(1)}
                                    className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold border-l border-gray-200 dark:border-gray-600"
                                  >+</button>
                                </div>
                                <span className="text-xs font-medium dark:text-gray-200">{itemName}</span>
                              </div>
                              <button onClick={() => updateItemQty(-quantity)} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          min="1" 
                          value={eklenecekAdet} 
                          onChange={e => setEklenecekAdet(Math.max(1, parseInt(e.target.value) || 1))} 
                          className="border border-gray-200 dark:border-gray-700 p-2 rounded w-16 text-sm bg-white dark:bg-gray-800 dark:text-white"
                          placeholder="Adet"
                        />
                        <select 
                          onChange={e => {
                            const yeniUrunAd = e.target.value;
                            if (!yeniUrunAd) return;
                            const urun = yemekler.find(y => y.ad === yeniUrunAd);
                            if (!urun) return;
                            const mevcutUrunler = safeParseYemekler(duzenlenenSiparis.yemekler);
                            const yeniUrunler = consolidateItems([...mevcutUrunler, `${eklenecekAdet}x ${yeniUrunAd}`]);
                            setDuzenlenenSiparis({
                              ...duzenlenenSiparis,
                              yemekler: yeniUrunler,
                              toplamFiyat: duzenlenenSiparis.toplamFiyat + (urun.fiyat * eklenecekAdet)
                            });
                            setEklenecekAdet(1);
                            e.target.value = "";
                          }}
                          className="border border-gray-200 dark:border-gray-700 p-2 rounded flex-1 text-sm bg-white dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">Ürün Ekle</option>
                          {yemekler.map(y => <option key={y.id} value={y.ad}>{y.ad}</option>)}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs font-bold mb-1 dark:text-white">Masa Hesabı</p>
                    <input 
                      type="number"
                      value={duzenlenenSiparis.toplamFiyat} 
                      onChange={e => setDuzenlenenSiparis({...duzenlenenSiparis, toplamFiyat: Number(e.target.value)})} 
                      className="border border-gray-200 dark:border-gray-700 p-2 rounded w-full mb-2 bg-white dark:bg-gray-800 dark:text-white" 
                      placeholder="Masa Hesabı" 
                    />
                  <div className="flex gap-2 mt-4">
                    <button onClick={async () => { 
                        await fetch(`/api/siparisler/${duzenlenenSiparis.id}`, { 
                          method: 'PUT', 
                          body: JSON.stringify(duzenlenenSiparis), 
                          headers: { 'Content-Type': 'application/json' } 
                        });
                        setDuzenlenenSiparis(null);
                        fetchData();
                      }} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex-1 text-sm">Kaydet</button>
                    <button onClick={() => { 
                      const yeniDurum = duzenlenenSiparis.durum === 'Tamamlandı' ? 'Bekliyor' : 'Tamamlandı';
                      handleSiparisDurumGuncelle(duzenlenenSiparis.id, yeniDurum); 
                      setDuzenlenenSiparis(null); 
                    }} className={`${duzenlenenSiparis.durum === 'Tamamlandı' ? 'bg-yellow-600' : 'bg-green-600'} text-white px-3 py-2 rounded-lg flex-1 text-sm`}>
                      {duzenlenenSiparis.durum === 'Tamamlandı' ? 'Aktif Et' : 'Tamamla'}
                    </button>
                    <button onClick={() => setDuzenlenenSiparis(null)} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-2 rounded-lg flex-1 text-sm">Kapat</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'ayarlar' && (
          <>
            <h3 className="text-sm font-bold mb-2 dark:text-white">Uygulama Ayarları</h3>
            <div className="space-y-2 mb-3">
              <input 
                value={ayarlar.uygulamaAdi} 
                onChange={e => setAyarlar({...ayarlar, uygulamaAdi: e.target.value})}
                placeholder="Uygulama Adı"
                className="border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm w-full bg-white dark:bg-gray-800 dark:text-white"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400">Logo (Önerilen: 200x200px)</div>
              <input type="file" onChange={e => setYeniLogoFile(e.target.files?.[0] || null)} className="border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm w-full bg-white dark:bg-gray-800 dark:text-white" />
              {ayarlar.logoUrl && <img src={ayarlar.logoUrl} alt="Logo" className="w-20 h-20 object-cover rounded-lg" />}
              <label className="flex items-center gap-2 text-sm dark:text-white">
                <input type="checkbox" checked={!!ayarlar.sistemAcik} onChange={e => setAyarlar({...ayarlar, sistemAcik: e.target.checked ? 1 : 0})} />
                Sistem Açık
              </label>
              <button onClick={handleAyarlarKaydet} className="bg-green-600 text-white px-3 py-2 rounded-lg w-full text-sm">
                Kaydet
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
