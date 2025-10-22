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
      // 🆕 New user — create minimal record with default 3 slots
      const newUser = {
        uid,
        phone: phone || null,
        name: null,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        slots: { usedSlots: 0, maxSlots: 3 }, // ✅ Default for all new users
      };

      await userRef.set(newUser);

      return res.status(201).json({
        message: "User created successfully",
        id: uid,
        data: newUser,
      });
    }

    // 🧭 Existing user — update login timestamp
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

/**
 * 🧭 GET /users/:uid
 * Used by Flutter to fetch user slot info.
 */
router.get("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const data = userDoc.data();
    return res.status(200).json({
      success: true,
      uid,
      slots: data.slots || { usedSlots: 0, maxSlots: 3 },
    });
  } catch (error) {
    console.error("🔥 Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user data",
      details: error.message,
    });
  }
});

/**
 * 🧩 PATCH /users/:uid/slots
 * Used by Flutter to sync updated slot count after payment.
 */
router.patch("/:uid/slots", async (req, res) => {
  try {
    const { uid } = req.params;
    const { slots } = req.body;

    if (!slots || typeof slots !== "object") {
      return res.status(400).json({ message: "Invalid slots payload" });
    }

    const userRef = db.collection("users").doc(uid);
    await userRef.set({ slots }, { merge: true });

    res.status(200).json({
      success: true,
      message: "Slots updated successfully",
      slots,
    });

    console.log(`✅ Slots updated for user ${uid}:`, slots);
  } catch (error) {
    console.error("🔥 Error updating slots:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update slots",
      details: error.message,
    });
  }
});

export default router;
