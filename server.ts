import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
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

async function setupDatabase() {
  await db.execute(`CREATE TABLE IF NOT EXISTS kategoriler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    iconName TEXT,
    sira INTEGER
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS yemekler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    fiyat REAL,
    aciklama TEXT,
    resim TEXT,
    kategori TEXT,
    aktif INTEGER DEFAULT 1
  )`);
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
    logoUrl TEXT,
    sistemAcik INTEGER DEFAULT 1
  )`);
  await db.execute(`INSERT OR IGNORE INTO ayarlar (id) VALUES (1)`);
  console.log("Veritabanı tabloları kontrol edildi/oluşturuldu.");
}

async function startServer() {
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
    console.log('Kategoriler:', result.rows);
    res.json(result.rows);
  });

  app.post("/api/kategoriler", async (req, res) => {
    const { ad, iconName, sira } = req.body;
    await db.execute({ sql: "INSERT INTO kategoriler (ad, iconName, sira) VALUES (?, ?, ?)", args: [ad, iconName, sira] });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.put("/api/kategoriler/:id", async (req, res) => {
    const { id } = req.params;
    const { ad, iconName, sira } = req.body;
    
    // Mevcut kategoriyi al
    const kategori = (await db.execute({ sql: "SELECT * FROM kategoriler WHERE id = ?", args: [id] })).rows[0];
    
    await db.execute({ 
      sql: "UPDATE kategoriler SET ad = ?, iconName = ?, sira = ? WHERE id = ?", 
      args: [
        ad !== undefined ? ad : kategori.ad, 
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
    const { ad, fiyat, aciklama, resim, kategori, aktif } = req.body;
    await db.execute({ sql: "INSERT INTO yemekler (ad, fiyat, aciklama, resim, kategori, aktif) VALUES (?, ?, ?, ?, ?, ?)", args: [ad, fiyat, aciklama, resim, kategori, aktif ? 1 : 0] });
    io.emit("data-changed");
    res.json({ status: "ok" });
  });

  app.put("/api/yemekler/:id", async (req, res) => {
    const { id } = req.params;
    const { ad, fiyat, aciklama, resim, kategori, aktif } = req.body;
    
    // Mevcut yemeği al
    const yemek = (await db.execute({ sql: "SELECT * FROM yemekler WHERE id = ?", args: [id] })).rows[0];
    
    await db.execute({ 
      sql: "UPDATE yemekler SET ad = ?, fiyat = ?, aciklama = ?, resim = ?, kategori = ?, aktif = ? WHERE id = ?", 
      args: [
        ad !== undefined ? ad : yemek.ad, 
        fiyat !== undefined ? fiyat : yemek.fiyat, 
        aciklama !== undefined ? aciklama : yemek.aciklama, 
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
      const result = await db.execute("SELECT * FROM siparisler");
      res.json(result.rows);
    } catch (error) {
      console.error("Siparişleri çekme hatası:", error);
      res.status(500).json({ error: "Siparişler çekilemedi" });
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
    const { uygulamaAdi, logoUrl, sistemAcik } = req.body;
    await db.execute({
      sql: "UPDATE ayarlar SET uygulamaAdi = ?, logoUrl = ?, sistemAcik = ? WHERE id = 1",
      args: [uygulamaAdi, logoUrl, sistemAcik ? 1 : 0],
    });
    io.emit("data-changed");
    res.json({ status: "ok" });
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
  });
}

startServer();
