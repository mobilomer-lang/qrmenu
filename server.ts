import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import https from "https";
import { Server } from "socket.io";
import db from "./src/lib/turso";
import multer from "multer";
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Cloudinary Yapılandırması
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.warn("UYARI: CLOUDINARY_CLOUD_NAME tanımlı değil. Resim yükleme çalışmayacaktır.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

const tr = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/locales/tr.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/locales/en.json'), 'utf8'));
const ar = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/locales/ar.json'), 'utf8'));
const de = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/locales/de.json'), 'utf8'));

// Exchange Rates Cache
let exchangeRates: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours (21600 seconds)

async function fetchExchangeRates() {
  try {
    const data: any = await new Promise((resolve, reject) => {
      https.get('https://api.exchangerate-api.com/v4/latest/TRY', (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
    exchangeRates = data;
    lastFetchTime = Date.now();
    return exchangeRates;
  } catch (error) {
    console.error('Exchange rates fetch error:', error);
    return exchangeRates; // Return stale data if fetch fails
  }
}

async function setupDatabase() {
  await db.execute(`CREATE TABLE IF NOT EXISTS diller (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kod TEXT NOT NULL UNIQUE,
    ad TEXT NOT NULL,
    bayrak TEXT,
    aktif INTEGER DEFAULT 1,
    rtl INTEGER DEFAULT 0
  )`);
  
  // Sütun kontrolü (eğer tablo zaten varsa ve bayrak sütunu eksikse)
  try {
    await db.execute("ALTER TABLE diller ADD COLUMN bayrak TEXT");
  } catch (e) {
    // Sütun zaten mevcut olabilir, hatayı yoksay
  }

  // Varsayılan dilleri ekle/güncelle
  const diller = [
    { kod: 'tr', ad: 'Türkçe', bayrak: 'https://flagcdn.com/w80/tr.png', aktif: 1, rtl: 0 },
    { kod: 'en', ad: 'English', bayrak: 'https://flagcdn.com/w80/gb.png', aktif: 1, rtl: 0 },
    { kod: 'ar', ad: 'العربية', bayrak: 'https://flagcdn.com/w80/sa.png', aktif: 1, rtl: 1 },
    { kod: 'de', ad: 'Deutsch', bayrak: 'https://flagcdn.com/w80/de.png', aktif: 1, rtl: 0 }
  ];
  
  for (const dil of diller) {
    // Önce eklemeyi dene
    await db.execute({
      sql: "INSERT OR IGNORE INTO diller (kod, ad, bayrak, aktif, rtl) VALUES (?, ?, ?, ?, ?)",
      args: [dil.kod, dil.ad, dil.bayrak, dil.aktif, dil.rtl]
    });
    // Sonra bayrağı güncelle (eğer zaten varsa)
    await db.execute({
      sql: "UPDATE diller SET bayrak = ? WHERE kod = ?",
      args: [dil.bayrak, dil.kod]
    });
  }

  await db.execute(`CREATE TABLE IF NOT EXISTS kategoriler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    ad_en TEXT,
    ad_ar TEXT,
    ad_de TEXT,
    iconName TEXT,
    sira INTEGER
  )`);

  // Kategoriler tablosuna yeni sütunları ekle (eğer yoksa)
  const kategoriSutunlar = ['ad_en', 'ad_ar', 'ad_de'];
  for (const sutun of kategoriSutunlar) {
    try {
      await db.execute(`ALTER TABLE kategoriler ADD COLUMN ${sutun} TEXT`);
    } catch (e) {}
  }

  await db.execute(`CREATE TABLE IF NOT EXISTS yemekler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    ad_en TEXT,
    ad_ar TEXT,
    ad_de TEXT,
    fiyat REAL,
    aciklama TEXT,
    aciklama_en TEXT,
    aciklama_ar TEXT,
    aciklama_de TEXT,
    resim TEXT,
    kategori TEXT,
    aktif INTEGER DEFAULT 1
  )`);

  // Yemekler tablosuna yeni sütunları ekle (eğer yoksa)
  const yemekSutunlar = ['ad_en', 'ad_ar', 'ad_de', 'aciklama_en', 'aciklama_ar', 'aciklama_de'];
  for (const sutun of yemekSutunlar) {
    try {
      await db.execute(`ALTER TABLE yemekler ADD COLUMN ${sutun} TEXT`);
    } catch (e) {}
  }

  await db.execute(`CREATE TABLE IF NOT EXISTS siparisler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    yemekler TEXT,
    masaNo TEXT,
    toplamFiyat REAL
  )`);
  // 'durum' sütununu kontrol et ve ekle
  try {
    await db.execute("ALTER TABLE siparisler ADD COLUMN durum TEXT DEFAULT 'Bekliyor'");
  } catch (e) {
    // Sütun zaten mevcut olabilir
  }
  await db.execute(`CREATE TABLE IF NOT EXISTS garsonCagrilar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    masaNo TEXT,
    durum TEXT,
    olusturuldu DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS ayarlar (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    uygulamaAdi TEXT DEFAULT 'Green Restaurant',
    uygulamaAdi_en TEXT,
    uygulamaAdi_ar TEXT,
    uygulamaAdi_de TEXT,
    logoUrl TEXT,
    sistemAcik INTEGER DEFAULT 1
  )`);

  // Ayarlar tablosuna yeni sütunları ekle (eğer yoksa)
  const ayarSutunlar = ['uygulamaAdi_en', 'uygulamaAdi_ar', 'uygulamaAdi_de'];
  for (const sutun of ayarSutunlar) {
    try {
      await db.execute(`ALTER TABLE ayarlar ADD COLUMN ${sutun} TEXT`);
    } catch (e) {}
  }

  await db.execute(`CREATE TABLE IF NOT EXISTS ceviriler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anahtar TEXT NOT NULL,
    dil_kod TEXT NOT NULL,
    deger TEXT NOT NULL,
    UNIQUE(anahtar, dil_kod)
  )`);

  // Başlangıç çevirilerini ekle (eğer tablo boşsa)
  const checkCeviriler = await db.execute("SELECT COUNT(*) as count FROM ceviriler");
  if (Number(checkCeviriler.rows[0].count) === 0) {
    const initialLocales: any = { tr, en, ar, de };
    for (const lang in initialLocales) {
      const flatTranslations = (obj: any, prefix = '') => {
        let items: any[] = [];
        for (const key in obj) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof obj[key] === 'object') {
            items = [...items, ...flatTranslations(obj[key], fullKey)];
          } else {
            items.push({ key: fullKey, value: obj[key] });
          }
        }
        return items;
      };

      const flattened = flatTranslations(initialLocales[lang]);
      for (const item of flattened) {
        await db.execute({
          sql: "INSERT OR IGNORE INTO ceviriler (anahtar, dil_kod, deger) VALUES (?, ?, ?)",
          args: [item.key, lang, item.value]
        });
      }
    }
  }

  await db.execute(`INSERT OR IGNORE INTO ayarlar (id) VALUES (1)`);
  console.log("Veritabanı tabloları kontrol edildi/oluşturuldu.");
}

async function startServer() {
  console.log("Sunucu başlatılıyor...");
  console.log("Ortam Değişkenleri Kontrolü:");
  console.log("- TURSO_DATABASE_URL:", process.env.TURSO_DATABASE_URL ? "Tanımlı (Gizlendi)" : "TANIMLANMAMIŞ!");
  console.log("- TURSO_AUTH_TOKEN:", process.env.TURSO_AUTH_TOKEN ? "Tanımlı (Gizlendi)" : "TANIMLANMAMIŞ!");
  console.log("- NODE_ENV:", process.env.NODE_ENV);

  await setupDatabase();
  const app = express();
  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = Number(process.env.PORT) || 3000;

  // Socket.io
  io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("yeni-siparis", (data) => {
      io.emit("yeni-siparis", data);
    });
    socket.on("garson-cagir", (data) => {
      io.emit("garson-cagir", data);
    });
  });

  // API routes
  app.get("/api/db-test", async (req, res) => {
    try {
      await db.execute("SELECT 1");
      res.json({ status: "ok", message: "Veritabanı bağlantısı başarılı" });
    } catch (error) {
      console.error("Veritabanı test hatası:", error);
      res.status(500).json({ 
        status: "error", 
        message: "Veritabanı bağlantısı başarısız", 
        details: error instanceof Error ? error.message : String(error),
        env: {
          url: process.env.TURSO_DATABASE_URL ? "Tanımlı" : "TANIMLANMAMIŞ",
          token: process.env.TURSO_AUTH_TOKEN ? "Tanımlı" : "TANIMLANMAMIŞ"
        }
      });
    }
  });

  app.post("/api/upload", upload.single('image'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenemedi' });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'qr-menu' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return res.status(500).json({ error: 'Cloudinary yükleme hatası', details: error.message });
        }
        console.log('Cloudinary Upload Success:', result?.secure_url);
        res.json({ url: result?.secure_url });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  });

  // API routes
  // Kategoriler
  app.get("/api/kategoriler", async (req, res) => {
    const result = await db.execute("SELECT * FROM kategoriler ORDER BY sira ASC");
    res.json(result.rows);
  });

  app.post("/api/kategoriler", async (req, res) => {
    const { ad, ad_en, ad_ar, ad_de, iconName, sira } = req.body;
    await db.execute({ 
      sql: "INSERT INTO kategoriler (ad, ad_en, ad_ar, ad_de, iconName, sira) VALUES (?, ?, ?, ?, ?, ?)", 
      args: [ad, ad_en, ad_ar, ad_de, iconName, sira] 
    });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.put("/api/kategoriler/:id", async (req, res) => {
    const { id } = req.params;
    const { ad, ad_en, ad_ar, ad_de, iconName, sira } = req.body;
    
    const kategori = (await db.execute({ sql: "SELECT * FROM kategoriler WHERE id = ?", args: [id] })).rows[0];
    
    await db.execute({ 
      sql: "UPDATE kategoriler SET ad = ?, ad_en = ?, ad_ar = ?, ad_de = ?, iconName = ?, sira = ? WHERE id = ?", 
      args: [
        ad !== undefined ? ad : kategori.ad, 
        ad_en !== undefined ? ad_en : kategori.ad_en, 
        ad_ar !== undefined ? ad_ar : kategori.ad_ar, 
        ad_de !== undefined ? ad_de : kategori.ad_de, 
        iconName !== undefined ? iconName : kategori.iconName, 
        sira !== undefined ? sira : kategori.sira, 
        id
      ] 
    });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.delete("/api/kategoriler/:id", async (req, res) => {
    const { id } = req.params;
    await db.execute({ sql: "DELETE FROM kategoriler WHERE id = ?", args: [id] });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  // Yemekler
  app.get("/api/yemekler", async (req, res) => {
    const result = await db.execute("SELECT * FROM yemekler");
    res.json(result.rows);
  });

  app.post("/api/yemekler", async (req, res) => {
    const { ad, ad_en, ad_ar, ad_de, fiyat, aciklama, aciklama_en, aciklama_ar, aciklama_de, resim, kategori, aktif } = req.body;
    await db.execute({ 
      sql: "INSERT INTO yemekler (ad, ad_en, ad_ar, ad_de, fiyat, aciklama, aciklama_en, aciklama_ar, aciklama_de, resim, kategori, aktif) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
      args: [ad, ad_en, ad_ar, ad_de, fiyat, aciklama, aciklama_en, aciklama_ar, aciklama_de, resim, kategori, aktif ? 1 : 0] 
    });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.put("/api/yemekler/:id", async (req, res) => {
    const { id } = req.params;
    const { ad, ad_en, ad_ar, ad_de, fiyat, aciklama, aciklama_en, aciklama_ar, aciklama_de, resim, kategori, aktif } = req.body;
    
    const yemek = (await db.execute({ sql: "SELECT * FROM yemekler WHERE id = ?", args: [id] })).rows[0];
    
    await db.execute({ 
      sql: "UPDATE yemekler SET ad = ?, ad_en = ?, ad_ar = ?, ad_de = ?, fiyat = ?, aciklama = ?, aciklama_en = ?, aciklama_ar = ?, aciklama_de = ?, resim = ?, kategori = ?, aktif = ? WHERE id = ?", 
      args: [
        ad !== undefined ? ad : yemek.ad, 
        ad_en !== undefined ? ad_en : yemek.ad_en, 
        ad_ar !== undefined ? ad_ar : yemek.ad_ar, 
        ad_de !== undefined ? ad_de : yemek.ad_de, 
        fiyat !== undefined ? fiyat : yemek.fiyat, 
        aciklama !== undefined ? aciklama : yemek.aciklama, 
        aciklama_en !== undefined ? aciklama_en : yemek.aciklama_en, 
        aciklama_ar !== undefined ? aciklama_ar : yemek.aciklama_ar, 
        aciklama_de !== undefined ? aciklama_de : yemek.aciklama_de, 
        resim !== undefined ? resim : yemek.resim, 
        kategori !== undefined ? kategori : yemek.kategori, 
        aktif !== undefined ? (aktif ? 1 : 0) : yemek.aktif, 
        id
      ] 
    });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.delete("/api/yemekler/:id", async (req, res) => {
    const { id } = req.params;
    await db.execute({ sql: "DELETE FROM yemekler WHERE id = ?", args: [id] });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.post("/api/siparisler", async (req, res) => {
    try {
      const { yemekler, masaNo, toplamFiyat } = req.body;
      await db.execute({
        sql: "INSERT INTO siparisler (yemekler, masaNo, toplamFiyat) VALUES (?, ?, ?)",
        args: [JSON.stringify(yemekler), masaNo, toplamFiyat],
      });
      io.emit("yeni-siparis", req.body);
      res.json({ status: "ok" });
    } catch (error) {
      console.error("Sipariş oluşturma hatası:", error);
      res.status(500).json({ error: "Sipariş oluşturulamadı" });
    }
  });

  app.get("/api/siparisler", async (req, res) => {
    try {
      console.log("Siparişler çekiliyor...");
      const result = await db.execute("SELECT * FROM siparisler");
      console.log("Siparişler çekildi, satır sayısı:", result.rows.length);
      res.json(result.rows);
    } catch (error) {
      console.error("Siparişleri çekme hatası (DETAYLI):", error);
      res.status(500).json({ error: "Siparişler çekilemedi", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/siparisler/:id", async (req, res) => {
    const { id } = req.params;
    const { yemekler, masaNo, toplamFiyat, durum } = req.body;
    
    // Mevcut siparişi al
    const siparis = (await db.execute({ sql: "SELECT * FROM siparisler WHERE id = ?", args: [id] })).rows[0];
    
    await db.execute({
      sql: "UPDATE siparisler SET yemekler = ?, masaNo = ?, toplamFiyat = ?, durum = ? WHERE id = ?",
      args: [
        yemekler ? JSON.stringify(yemekler) : siparis.yemekler,
        masaNo !== undefined ? masaNo : siparis.masaNo,
        toplamFiyat !== undefined ? toplamFiyat : siparis.toplamFiyat,
        durum !== undefined ? durum : siparis.durum,
        id
      ],
    });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.post("/api/garson-cagir", async (req, res) => {
    try {
      const { masaNo } = req.body;
      await db.execute({
        sql: "INSERT INTO garsonCagrilar (masaNo, durum) VALUES (?, 'Bekliyor')",
        args: [masaNo],
      });
      io.emit("garson-cagir", req.body);
      res.json({ status: "ok" });
    } catch (error) {
      console.error("Garson çağırma hatası:", error);
      res.status(500).json({ error: "Garson çağrılamadı" });
    }
  });

  app.get("/api/cagrilar", async (req, res) => {
    try {
      const result = await db.execute("SELECT * FROM garsonCagrilar WHERE durum = 'Bekliyor' ORDER BY olusturuldu DESC");
      res.json(result.rows);
    } catch (error) {
      console.error("Çağrıları çekme hatası:", error);
      res.status(500).json({ error: "Çağrılar çekilemedi" });
    }
  });

  app.get("/api/cagrilar/tamamlanan", async (req, res) => {
    const result = await db.execute("SELECT * FROM garsonCagrilar WHERE durum = 'Tamamlandı' ORDER BY olusturuldu DESC");
    res.json(result.rows);
  });

  app.put("/api/cagrilar/:id", async (req, res) => {
    const { id } = req.params;
    const { durum } = req.body;
    await db.execute({
      sql: "UPDATE garsonCagrilar SET durum = ? WHERE id = ?",
      args: [durum, id],
    });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.get("/api/ayarlar", async (req, res) => {
    const result = await db.execute("SELECT * FROM ayarlar WHERE id = 1");
    res.json(result.rows[0]);
  });

  app.get("/api/exchange-rates", async (req, res) => {
    if (!exchangeRates || Date.now() - lastFetchTime > CACHE_DURATION) {
      await fetchExchangeRates();
    }
    res.json(exchangeRates);
  });

  app.get("/manifest.json", async (req, res) => {
    const result = await db.execute("SELECT * FROM ayarlar WHERE id = 1");
    const ayarlar = result.rows[0];
    res.json({
      name: ayarlar.uygulamaAdi,
      short_name: ayarlar.uygulamaAdi,
      icons: [
        {
          src: ayarlar.logoUrl || '/logo.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: ayarlar.logoUrl || '/logo.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ],
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#22c55e'
    });
  });

  app.put("/api/ayarlar", async (req, res) => {
    const { uygulamaAdi, uygulamaAdi_en, uygulamaAdi_ar, uygulamaAdi_de, logoUrl, sistemAcik } = req.body;
    await db.execute({
      sql: "UPDATE ayarlar SET uygulamaAdi = ?, uygulamaAdi_en = ?, uygulamaAdi_ar = ?, uygulamaAdi_de = ?, logoUrl = ?, sistemAcik = ? WHERE id = 1",
      args: [uygulamaAdi, uygulamaAdi_en, uygulamaAdi_ar, uygulamaAdi_de, logoUrl, sistemAcik ? 1 : 0],
    });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  // Diller
  app.get("/api/diller", async (req, res) => {
    const result = await db.execute("SELECT * FROM diller");
    res.json(result.rows);
  });

  app.post("/api/diller", async (req, res) => {
    const { kod, ad, bayrak, aktif, rtl } = req.body;
    await db.execute({
      sql: "INSERT INTO diller (kod, ad, bayrak, aktif, rtl) VALUES (?, ?, ?, ?, ?)",
      args: [kod, ad, bayrak, aktif ? 1 : 0, rtl ? 1 : 0]
    });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.put("/api/diller/:id", async (req, res) => {
    const { id } = req.params;
    const { kod, ad, bayrak, aktif, rtl } = req.body;
    await db.execute({
      sql: "UPDATE diller SET kod = ?, ad = ?, bayrak = ?, aktif = ?, rtl = ? WHERE id = ?",
      args: [kod, ad, bayrak, aktif ? 1 : 0, rtl ? 1 : 0, id]
    });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.delete("/api/diller/:id", async (req, res) => {
    const { id } = req.params;
    await db.execute({ sql: "DELETE FROM diller WHERE id = ?", args: [id] });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  // Çeviriler
  app.get("/api/ceviriler/:lang", async (req, res) => {
    const { lang } = req.params;
    const result = await db.execute({
      sql: "SELECT anahtar, deger FROM ceviriler WHERE dil_kod = ?",
      args: [lang]
    });
    
    // Flattened listeyi nested objeye çevir
    const translations: any = {};
    result.rows.forEach((row: any) => {
      const keys = row.anahtar.split('.');
      let current = translations;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (i === keys.length - 1) {
          current[key] = row.deger;
        } else {
          current[key] = current[key] || {};
          current = current[key];
        }
      }
    });
    
    res.json(translations);
  });

  app.post("/api/ceviriler", async (req, res) => {
    const { anahtar, dil_kod, deger } = req.body;
    await db.execute({
      sql: "INSERT OR REPLACE INTO ceviriler (anahtar, dil_kod, deger) VALUES (?, ?, ?)",
      args: [anahtar, dil_kod, deger]
    });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.get("/api/ceviriler-eksik", async (req, res) => {
    // Tüm anahtarları al
    const keysResult = await db.execute("SELECT DISTINCT anahtar FROM ceviriler");
    const keys = keysResult.rows.map((r: any) => r.anahtar);
    
    // Tüm dilleri al
    const langsResult = await db.execute("SELECT kod FROM diller WHERE aktif = 1");
    const langs = langsResult.rows.map((r: any) => r.kod);
    
    const missing: any[] = [];
    
    for (const key of keys) {
      for (const lang of langs) {
        const exists = await db.execute({
          sql: "SELECT 1 FROM ceviriler WHERE anahtar = ? AND dil_kod = ?",
          args: [key, lang]
        });
        if (exists.rows.length === 0) {
          missing.push({ key, lang });
        }
      }
    }
    
    res.json(missing);
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Render keep-alive ping (Her 10 dakikada bir kendi URL'sine istek atar)
    const APP_URL = "https://qr.nrgonline.shop/";
    setInterval(() => {
      https.get(APP_URL, (res) => {
        console.log(`Keep-alive ping sent to ${APP_URL} - Status: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error("Keep-alive ping failed:", err.message);
      });
    }, 10 * 60 * 1000); // 10 minutes
  });
}

startServer();
