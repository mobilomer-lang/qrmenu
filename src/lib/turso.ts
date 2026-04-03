import { createClient } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL) {
  console.error("KRİTİK HATA: TURSO_DATABASE_URL ortam değişkeni eksik!");
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

export default client;
