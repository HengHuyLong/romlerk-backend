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

// ✅ Use environment variable on Render
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.log("🔐 Using SERVICE_ACCOUNT from environment variables (Render)");
  serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON.replace(/\\n/g, "\n")
  );
} else {
  // ✅ Use local file for development
  const serviceAccountPath = path.resolve(__dirname, "../../serviceAccountKey.json");

  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ serviceAccountKey.json not found:", serviceAccountPath);
    process.exit(1);
  }

  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  console.log("🔐 Using local serviceAccountKey.json (development)");
}

// ✅ Ensure correct bucket name
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

// ✅ Firestore instance
export const db = getFirestore(defaultApp, "romlerk-db");

// ✅ Auth instance
export const auth = admin.auth();

// ✅ Storage bucket
export const bucket = admin.storage().bucket(bucketName);

export { admin };
