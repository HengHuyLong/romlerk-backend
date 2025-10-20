// config/firebase.js
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;

// ✅ 1. Prefer environment variable (for Render)
if (process.env.SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

    // 🔧 Fix escaped newlines (Render stores \n as literal text)
    if (serviceAccount.private_key?.includes("\\n")) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    console.log("🔐 Using SERVICE_ACCOUNT from environment variables (with newline fix)");
  } catch (err) {
    console.error("❌ Invalid SERVICE_ACCOUNT JSON:", err.message);
    process.exit(1);
  }
} else {
  // ✅ 2. Fallback to local file (for local development)
  const serviceAccountPath = path.resolve(__dirname, "../../serviceAccountKey.json");
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ serviceAccountKey.json not found:", serviceAccountPath);
    process.exit(1);
  }
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  console.log("📁 Using local serviceAccountKey.json");
}

// ✅ Ensure correct bucket name (new format supported)
const bucketName = process.env.FIREBASE_STORAGE_BUCKET?.replace("gs://", "");
if (!bucketName) {
  console.error("❌ FIREBASE_STORAGE_BUCKET missing in .env");
  process.exit(1);
}

// ✅ Initialize Firebase Admin
let defaultApp;
if (!admin.apps.length) {
  defaultApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: bucketName,
  });
  console.log(`✅ Firebase Admin initialized for project: ${serviceAccount.project_id}`);
  console.log(`📦 Using storage bucket: ${bucketName}`);
}

// ✅ Export Firestore (custom DB), Auth, and Storage bucket
export const db = getFirestore(defaultApp, "romlerk-db");
export const auth = admin.auth();
export const bucket = admin.storage().bucket(bucketName);

export { admin };
