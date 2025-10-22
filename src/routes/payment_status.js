import express from "express";
import { db } from "../config/firebase.js"; // ✅ use global Firestore instance

const router = express.Router();

/**
 * 🧾 POST /payment-status (ABA callback endpoint)
 * ABA calls this when payment completes or fails
 */
router.post("/", async (req, res) => {
  try {
    const { tran_id, status, apv, merchant_ref_no, uid } = req.body;

    console.log("💬 [ABA Callback Received]:", req.body);

    if (!tran_id || status === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (tran_id or status)",
      });
    }

    // 🔍 Try to detect UID automatically if not provided
    let userId = uid;
    if (!userId) {
      const snapshot = await db
        .collectionGroup("payments")
        .where("tran_id", "==", tran_id)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        userId = doc.ref.parent.parent?.id || null;
        console.log(`📄 Found userId for tran_id=${tran_id}: ${userId}`);
      } else {
        console.warn(`⚠️ No matching user found for tran_id=${tran_id}`);
      }
    }

    // 🔍 Choose correct Firestore path
    const paymentRef = userId
      ? db.collection("users").doc(userId).collection("payments").doc(tran_id)
      : db.collection("payments").doc(tran_id);

    // 🧩 Update Firestore payment document
    await paymentRef.set(
      {
        tran_id,
        status,
        apv: apv || null,
        merchant_ref_no: merchant_ref_no || null,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log(
      `📡 Firestore updated for tran_id=${tran_id} | status=${status} | user=${userId || "no uid"}`
    );

    // 🔁 Determine redirect URL
    const baseUrl = process.env.BASE_URL || "https://romlerk-backend.onrender.com"; // ✅ use .env or fallback
    let redirectUrl = `${baseUrl}/payment/after?state=fail&tran_id=${tran_id}`;

    switch (String(status)) {
      case "0":
        console.log(`✅ Payment SUCCESS for tran_id: ${tran_id}`);
        redirectUrl = `${baseUrl}/payment/after?state=success&tran_id=${tran_id}`;
        break;
      case "1":
        console.log(`⏳ Payment PENDING for tran_id: ${tran_id}`);
        redirectUrl = `${baseUrl}/payment/after?state=pending&tran_id=${tran_id}`;
        break;
      default:
        console.log(`❌ Payment FAILED for tran_id: ${tran_id}`);
        redirectUrl = `${baseUrl}/payment/fail?tran_id=${tran_id}`;
        break;
    }

    console.log(`🔁 Redirecting ABA → ${redirectUrl}`);
    return res.redirect(302, redirectUrl);
  } catch (error) {
    console.error("🔥 Error handling ABA callback:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while handling callback",
      details: error.message,
    });
  }
});

/**
 * 🔍 GET /payment-status/status/:tran_id?uid=xxxx
 * Flutter polls this every few seconds
 */
router.get("/status/:tran_id", async (req, res) => {
  try {
    const { tran_id } = req.params;
    const { uid } = req.query;

    // ✅ Fetch from correct location
    const paymentRef = uid
      ? db.collection("users").doc(uid).collection("payments").doc(tran_id)
      : db.collection("payments").doc(tran_id);

    const doc = await paymentRef.get();

    if (!doc.exists) {
      console.warn(`⚠️ Payment not found for tran_id=${tran_id}, uid=${uid}`);
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const data = doc.data();
    console.log(`📄 Polled tran_id=${tran_id}, status=${data.status || "unknown"}`);

    return res.status(200).json({
      success: true,
      tran_id,
      data,
    });
  } catch (error) {
    console.error("🔥 Error fetching payment status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment status",
      details: error.message,
    });
  }
});

export default router;
