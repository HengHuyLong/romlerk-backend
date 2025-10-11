import express from "express";
import multer from "multer";
import { verifyFirebaseToken } from "../middleware/auth.js";
import { bucket, db } from "../config/firebase.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ============================================================
 🔹 1. TEST UPLOAD (for Postman or debugging)
============================================================ */
router.post(
  "/test-upload",
  verifyFirebaseToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const { uid } = req.user || {};
      if (!uid) return res.status(401).json({ error: "Missing user UID" });

      if (!req.file)
        return res.status(400).json({ error: "No file uploaded" });

      const fileName = `${uid}/test_uploads/${Date.now()}_${req.file.originalname}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: { firebaseStorageDownloadTokens: uid },
      });

      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        fileName
      )}?alt=media`;

      console.log("✅ Test upload successful ->", publicUrl);

      return res.status(200).json({
        message: "✅ Test upload successful!",
        fileName,
        publicUrl,
      });
    } catch (error) {
      console.error("🔥 Error uploading test file:", error);
      return res.status(500).json({
        error: "Upload failed",
        details: error.message,
      });
    }
  }
);

/* ============================================================
 🔹 2. UPLOAD IMAGE (called by ApiService.uploadImage)
============================================================ */
router.post(
  "/upload",
  verifyFirebaseToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const { uid } = req.user || {};
      if (!uid) return res.status(401).json({ error: "Missing user UID" });

      if (!req.file)
        return res.status(400).json({ error: "No file uploaded" });

      const fileName = `${uid}/documents/${Date.now()}_${req.file.originalname}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: { firebaseStorageDownloadTokens: uid },
      });

      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        fileName
      )}?alt=media`;

      console.log("✅ Upload successful ->", publicUrl);

      return res.status(200).json({
        message: "✅ Upload successful",
        imageUrl: publicUrl,
      });
    } catch (error) {
      console.error("🔥 Error uploading document image:", error);
      return res.status(500).json({
        error: "Failed to upload image",
        details: error.message,
      });
    }
  }
);

/* ============================================================
 🔹 3. SAVE DOCUMENT (called by ApiService.saveDocument)
============================================================ */
router.post("/", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user || {};
    if (!uid) return res.status(401).json({ error: "Missing user UID" });

    const data = req.body || {};
    console.log("📥 Incoming document data:", data);

    if (!data.type)
      return res.status(400).json({ error: "Missing document type" });

    const now = new Date().toISOString();
    const docWithMeta = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db
      .collection("users")
      .doc(uid)
      .collection("documents")
      .add(docWithMeta);

    console.log(`✅ Document saved for user: ${uid}`);

    return res.status(201).json({
      message: "✅ Document saved successfully",
      id: docRef.id,
      data: docWithMeta,
    });
  } catch (error) {
    console.error("🔥 Error saving document:", error);
    return res.status(500).json({
      error: "Failed to save document",
      details: error.message,
    });
  }
});

/* ============================================================
 🔹 4. FETCH ALL DOCUMENTS (for DocumentsScreen)
============================================================ */
router.get("/", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user || {};
    if (!uid) return res.status(401).json({ error: "Missing user UID" });

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("documents")
      .get();

    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    documents.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    console.log(`📦 Fetched ${documents.length} documents for user ${uid}`);

    return res.status(200).json(documents);
  } catch (error) {
    console.error("🔥 Error fetching documents:", error);
    return res.status(500).json({
      error: "Failed to fetch documents",
      details: error.message,
    });
  }
});

/* ============================================================
 🔹 5. UPDATE DOCUMENT (called by ApiService.updateDocument)
============================================================ */
router.patch("/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user || {};
    const { id } = req.params;

    if (!uid) return res.status(401).json({ error: "Missing user UID" });
    if (!id) return res.status(400).json({ error: "Missing document ID" });

    const updates = req.body || {};
    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: "No update fields provided" });

    const docRef = db
      .collection("users")
      .doc(uid)
      .collection("documents")
      .doc(id);

    const docSnap = await docRef.get();
    if (!docSnap.exists)
      return res.status(404).json({ error: "Document not found" });

    updates.updatedAt = new Date().toISOString();

    await docRef.set(updates, { merge: true });

    console.log(`✅ Document ${id} updated for user ${uid}`);
    return res.status(200).json({
      message: "✅ Document updated successfully",
      id,
      updates,
    });
  } catch (error) {
    console.error("🔥 Error updating document:", error);
    return res.status(500).json({
      error: "Failed to update document",
      details: error.message,
    });
  }
});

export default router;
