// routes/profiles.js
import express from "express";
import { verifyFirebaseToken } from "../middleware/auth.js";
import { db } from "../config/firebase.js";

const router = express.Router();

/**
 * ✅ GET /profiles
 * Fetch all profiles for the authenticated user.
 */
router.get("/", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;

    const profilesRef = db.collection("users").doc(uid).collection("profiles");
    const snapshot = await profilesRef.get();

    const profiles = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(profiles);
  } catch (error) {
    console.error("🔥 Error fetching profiles:", error);
    return res.status(500).json({
      error: "Failed to fetch profiles",
      details: error.message || error.toString(),
    });
  }
});

/**
 * ✅ POST /profiles
 * Create a new profile for the user.
 */
router.post("/", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { name, type } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Invalid profile name" });
    }

    const profilesRef = db.collection("users").doc(uid).collection("profiles");

    const newProfile = {
      name: name.trim(),
      type: type || "Other",
      createdAt: new Date().toISOString(),
    };

    const docRef = await profilesRef.add(newProfile);

    return res.status(201).json({
      message: "Profile created successfully",
      id: docRef.id,
      data: newProfile,
    });
  } catch (error) {
    console.error("🔥 Error creating profile:", error);
    return res.status(500).json({
      error: "Failed to create profile",
      details: error.message || error.toString(),
    });
  }
});

/**
 * ✅ PATCH /profiles/:id
 * Update profile name and type
 */
router.patch("/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const { name, type } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Invalid profile name" });
    }

    const profileRef = db
      .collection("users")
      .doc(uid)
      .collection("profiles")
      .doc(id);

    const doc = await profileRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const updatedData = {
      name: name.trim(),
      type: type || "Other",
    };

    await profileRef.update(updatedData);

    return res.status(200).json({
      message: "Profile updated successfully",
      data: { id, ...updatedData },
    });
  } catch (error) {
    console.error("🔥 Error updating profile:", error);
    return res.status(500).json({
      error: "Failed to update profile",
      details: error.message || error.toString(),
    });
  }
});

export default router;
