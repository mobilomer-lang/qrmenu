import { useEffect, useState } from 'react';
import { Utensils, ClipboardList, LayoutGrid, Trash2, Bell } from 'lucide-react';
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
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Yükleme başarısız');
    const data = await response.json();
    return data.url;
  };

  const [duzenlenenSiparis, setDuzenlenenSiparis] = useState<any>(null);
  const [siparisler, setSiparisler] = useState<any[]>([]);
  const [cagrilar, setCagrilar] = useState<any[]>([]);

  const handleSiparisDurumGuncelle = async (id: string, durum: string) => {
    await fetch(`/api/siparisler/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify({ durum }), 
      headers: { 'Content-Type': 'application/json' } 
    });
    fetchData();
  };

  const fetchData = async () => {
    try {
      const [katRes, yemekRes, sipRes, cagriRes, ayarlarRes] = await Promise.all([
        fetch('/api/kategoriler').then(r => r.json()),
        fetch('/api/yemekler').then(r => r.json()),
        fetch('/api/siparisler').then(r => r.json()),
        fetch('/api/cagrilar').then(r => r.json()),
        fetch('/api/ayarlar').then(r => r.json()),
      ]);
      setKategoriler(katRes);
      setYemekler(yemekRes);
      setSiparisler(sipRes);
      setCagrilar(cagriRes);
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
  };

  const handleKategoriKaydet = async () => {
    if (duzenlenenKategori) {
      await fetch(`/api/kategoriler/${duzenlenenKategori.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: yeniKategoriAd, iconName: yeniKategoriIcon, sira: Number(yeniKategoriSira) }),
      });
      setDuzenlenenKategori(null);
    } else if (yeniKategoriAd) {
      await fetch('/api/kategoriler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: yeniKategoriAd, iconName: yeniKategoriIcon, sira: Number(yeniKategoriSira) }),
      });
    }
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
    setYeniYemekAktif(y.aktif);
  };

  const handleYemekToggle = async (y: any) => {
    await fetch(`/api/yemekler/${y.id}`, { method: 'PUT', body: JSON.stringify({ aktif: !y.aktif }), headers: { 'Content-Type': 'application/json' } });
    fetchData();
  };

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
    <div className="p-3 bg-gray-50 min-h-screen w-full overflow-x-hidden">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Süper Admin Paneli</h2>
      
      {successMessage && (
        <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4 text-sm font-medium">
          {successMessage}
        </div>
      )}
      
      {/* Garson Çağrıları - Her zaman görünür */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 w-full">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-red-600">
          <Bell size={16} /> Bekleyen Çağrılar ({cagrilar.length})
        </h3>
        <div className="space-y-2">
          {cagrilar.map((cagri) => (
            <div key={cagri.id} className="p-3 border-b border-gray-50 flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">Masa: {cagri.masaNo}</span>
              <button onClick={() => handleTamamla(cagri.id)} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs">Tamamla</button>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Tasarımı */}
      <div className="grid grid-cols-2 gap-3 mb-4 w-full">
        {menuItems.map((item, i) => (
          <button key={i} onClick={() => setActiveTab(item.tab as any)} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-1 text-center">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <item.icon size={20} />
            </div>
            <h4 className="font-bold text-gray-900 text-xs">{item.name}</h4>
          </button>
        ))}
      </div>

      {/* Tab İçerikleri */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full">
        {activeTab === 'yemekler' && (
          <>
            <h3 className="text-sm font-bold mb-2">{duzenlenenYemek ? 'Yemek Düzenle' : 'Yemek Ekle'}</h3>
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
              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                <input type="checkbox" checked={yeniYemekAktif} onChange={e => setYeniYemekAktif(e.target.checked)} />
                Aktif
              </label>
              <button onClick={handleYemekKaydet} className="bg-green-600 text-white px-3 py-2 rounded-lg w-full text-sm">
                {duzenlenenYemek ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
            <div className="space-y-2">
              {yemekler.map(y => (
                <div key={y.id} className="flex justify-between items-center p-2 border-b border-gray-50 text-sm">
                  <div className="flex items-center gap-2">
                    {y.resim && <img src={y.resim} alt={y.ad} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />}
                    <div>
                      <p className="font-medium text-gray-700">{y.ad}</p>
                      <p className="text-xs text-gray-500">{y.fiyat} TL - {y.aktif ? 'Aktif' : 'Pasif'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleYemekToggle(y)} className={y.aktif ? 'text-yellow-600' : 'text-green-600'}>{y.aktif ? 'Pasif Yap' : 'Aktif Yap'}</button>
                    <button onClick={async () => { await fetch(`/api/yemekler/${y.id}`, { method: 'PUT', body: JSON.stringify({ aktif: 0 }), headers: { 'Content-Type': 'application/json' } }); fetchData(); }} className="text-orange-600">Tükendi</button>
                    <button onClick={() => handleYemekDuzenle(y)} className="text-blue-500">Düzenle</button>
                    <button onClick={() => handleYemekSil(y.id)} className="text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'kategoriler' && (
          <>
            <h3 className="text-sm font-bold mb-2">{duzenlenenKategori ? 'Kategori Düzenle' : 'Kategori Ekle'}</h3>
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
                <div key={k.id} className="flex justify-between items-center p-2 border-b border-gray-50 text-sm">
                  <span className="font-medium text-gray-700">{k.sira}. {k.ad}</span>
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
            <h3 className="text-sm font-bold mb-2">Müşteri Siparişleri</h3>
            {siparisler.length === 0 ? <p className="text-xs text-gray-500">Henüz sipariş yok.</p> : siparisler.map(s => (
              <div key={s.id} className="p-2 border-b border-gray-50 text-sm cursor-pointer" onClick={() => setDuzenlenenSiparis(s)}>
                <p className="font-bold">{s.yemekler ? (typeof s.yemekler === 'string' ? JSON.parse(s.yemekler).join(', ') : s.yemekler.join(', ')) : s.yemekAd}</p>
                <p className="text-xs text-gray-500">Masa: {s.masaNo} - {s.toplamFiyat} TL - Durum: {s.durum || 'Bekliyor'}</p>
              </div>
            ))}
            
            {duzenlenenSiparis && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-4 rounded-xl w-full max-w-sm">
                  <h3 className="font-bold mb-2">Sipariş Düzenle</h3>
                  <input 
                    value={duzenlenenSiparis.masaNo} 
                    onChange={e => setDuzenlenenSiparis({...duzenlenenSiparis, masaNo: e.target.value})} 
                    className="border border-gray-200 dark:border-gray-700 p-2 rounded w-full mb-2 bg-white dark:bg-gray-800 dark:text-white" 
                    placeholder="Masa No" 
                  />
                  <div className="mb-2">
                    <p className="text-xs font-bold mb-1 dark:text-white">Ürünler:</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(typeof duzenlenenSiparis.yemekler === 'string' ? JSON.parse(duzenlenenSiparis.yemekler) : duzenlenenSiparis.yemekler).map((y: string, i: number) => (
                        <span key={i} className="bg-gray-100 px-2 py-1 rounded text-xs flex items-center gap-1">
                          {y}
                          <button onClick={() => {
                            const urun = yemekler.find(yemek => yemek.ad === y);
                            const fiyat = urun ? urun.fiyat : 0;
                            const mevcutUrunler = typeof duzenlenenSiparis.yemekler === 'string' ? JSON.parse(duzenlenenSiparis.yemekler) : duzenlenenSiparis.yemekler;
                            setDuzenlenenSiparis({
                              ...duzenlenenSiparis,
                              yemekler: mevcutUrunler.filter((_: any, index: number) => index !== i),
                              toplamFiyat: duzenlenenSiparis.toplamFiyat - fiyat
                            });
                          }} className="text-red-500">x</button>
                        </span>
                      ))}
                    </div>
                    <select 
                      onChange={e => {
                        const yeniUrunAd = e.target.value;
                        if (!yeniUrunAd) return;
                        const urun = yemekler.find(y => y.ad === yeniUrunAd);
                        if (!urun) return;
                        const mevcutUrunler = typeof duzenlenenSiparis.yemekler === 'string' ? JSON.parse(duzenlenenSiparis.yemekler) : duzenlenenSiparis.yemekler;
                        setDuzenlenenSiparis({
                          ...duzenlenenSiparis,
                          yemekler: [...mevcutUrunler, yeniUrunAd],
                          toplamFiyat: duzenlenenSiparis.toplamFiyat + urun.fiyat
                        });
                      }}
                      className="border p-2 rounded w-full text-sm"
                    >
                      <option value="">Ürün Ekle</option>
                      {yemekler.map(y => <option key={y.id} value={y.ad}>{y.ad}</option>)}
                    </select>
                  </div>
                  <input 
                    type="number"
                    value={duzenlenenSiparis.toplamFiyat} 
                    onChange={e => setDuzenlenenSiparis({...duzenlenenSiparis, toplamFiyat: Number(e.target.value)})} 
                    className="border border-gray-200 dark:border-gray-700 p-2 rounded w-full mb-2 bg-white dark:bg-gray-800 dark:text-white" 
                    placeholder="Toplam Fiyat" 
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
                    <button onClick={() => setDuzenlenenSiparis(null)} className="bg-gray-200 px-3 py-2 rounded-lg flex-1 text-sm">Kapat</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'ayarlar' && (
          <>
            <h3 className="text-sm font-bold mb-2">Uygulama Ayarları</h3>
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
