// routes/userRoutes.js
import express from "express";
import { verifyFirebaseToken } from "../middleware/auth.js";
import { db } from "../config/firebase.js";

const router = express.Router();

/**
 * POST /users/login
 * Step 1 — Called after OTP verification.
 * Checks if the user exists. Creates it if not (with name: null).
 */
router.post("/login", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, phone } = req.user || {};

    if (!uid) {
      console.error("❌ Missing UID from Firebase token");
      return res.status(400).json({ error: "Invalid or missing UID" });
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // New user — create minimal record (no name yet)
      const newUser = {
        uid,
        phone: phone || null,
        name: null, // no default string, leave empty
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      await userRef.set(newUser);

      return res.status(201).json({
        message: "User created successfully",
        id: uid,
        data: newUser,
      });
    }

    // Existing user — update last login only
    const existingData = userDoc.data();
    const updates = { lastLoginAt: new Date().toISOString() };

    await userRef.update(updates);

    return res.status(200).json({
      message: "User exists and logged in",
      id: uid,
      data: { ...existingData, ...updates },
    });
  } catch (error) {
    console.error("🔥 Firestore write error:", error);
    return res.status(500).json({
      error: "Unexpected Firestore error",
      details: error.message || error.toString(),
    });
  }
});

/**
 * PATCH /users/profile
 * Step 2 — Called from ProfileSetupScreen to update name or profile info.
 */
router.patch("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user || {};
    const { name } = req.body || {};

    if (!uid) {
      return res.status(400).json({ error: "Invalid or missing UID" });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Invalid name format" });
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const updates = {
      name: name.trim(),
      updatedAt: new Date().toISOString(),
    };

    await userRef.update(updates);

    // Avoided a second database read for efficiency.
    // Merge existing data with updates and return immediately.
    const existingData = userDoc.data();
    const updatedData = { ...existingData, ...updates };

    return res.status(200).json({
      message: "Profile updated successfully",
      data: updatedData,
    });
  } catch (error) {
    console.error("🔥 Firestore update error:", error);
    return res.status(500).json({
      error: "Unexpected error updating profile",
      details: error.message || error.toString(),
    });
  }
});

export default router;
