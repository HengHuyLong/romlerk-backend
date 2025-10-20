import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import dotenv from "dotenv";
import { db } from "../config/firebase.js"; // ✅ use shared Firestore

dotenv.config();
const router = express.Router();

// 🔐 Load sensitive config
const ABA_API_KEY = process.env.ABA_API_KEY;
const ABA_MERCHANT_ID = process.env.ABA_MERCHANT_ID;
const ABA_CALLBACK_URL = process.env.ABA_CALLBACK_URL;

// 🔹 Generate ABA PayWay HMAC SHA512 hash (Base64 encoded)
function generatePaywayHash({
  req_time,
  merchant_id,
  tran_id,
  amount,
  items,
  first_name,
  last_name,
  email,
  phone,
  purchase_type,
  payment_option,
  callback_url,
  return_deeplink,
  currency,
  custom_fields,
  return_params,
  payout,
  lifetime,
  qr_image_template,
  api_key,
}) {
  const safe = (v) => (v === undefined || v === null ? "" : String(v));

  const b4hash =
    safe(req_time) +
    safe(merchant_id) +
    safe(tran_id) +
    safe(amount) +
    safe(items) +
    safe(first_name) +
    safe(last_name) +
    safe(email) +
    safe(phone) +
    safe(purchase_type) +
    safe(payment_option) +
    safe(callback_url) +
    safe(return_deeplink) +
    safe(currency) +
    safe(custom_fields) +
    safe(return_params) +
    safe(payout) +
    safe(lifetime) +
    safe(qr_image_template);

  return crypto.createHmac("sha512", api_key).update(b4hash).digest("base64");
}

// 🔹 Generate UTC timestamp (YYYYMMDDHHmmss)
function generateReqTimeUTC() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
    now.getUTCDate()
  )}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(
    now.getUTCSeconds()
  )}`;
}

// ─────────────────────────────────────────────
// 🧩 POST /api/payment
// Create a new ABA QR payment (per user)
// ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      req_time = generateReqTimeUTC(),
      merchant_id = ABA_MERCHANT_ID,
      tran_id,
      first_name = "",
      last_name = "",
      email = "",
      phone = "",
      amount,
      currency = "USD",
      purchase_type = "purchase",
      payment_option = "abapay_khqr",
      items = "",
      callback_url = ABA_CALLBACK_URL,
      return_deeplink = "",
      custom_fields = "",
      return_params = "",
      payout = "",
      lifetime = 6,
      qr_image_template = "template3_color",
      uid, // ✅ expect user id in body
    } = req.body;

    console.log("💬 Generating PayWay QR for user:", uid);

    if (!uid) {
      return res.status(400).json({
        success: false,
        error: "Missing user ID (uid)",
      });
    }

    if (!merchant_id || !tran_id || !amount || !currency || !payment_option) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
      });
    }

    const encodedCallback = callback_url
      ? Buffer.from(callback_url).toString("base64")
      : "";

    const hash = generatePaywayHash({
      req_time,
      merchant_id,
      tran_id,
      amount,
      items,
      first_name,
      last_name,
      email,
      phone,
      purchase_type,
      payment_option,
      callback_url: encodedCallback,
      return_deeplink,
      currency,
      custom_fields,
      return_params,
      payout,
      lifetime,
      qr_image_template,
      api_key: ABA_API_KEY,
    });

    const payload = {
      req_time,
      merchant_id,
      tran_id,
      first_name,
      last_name,
      email,
      phone,
      amount,
      purchase_type,
      payment_option,
      items,
      currency,
      callback_url: encodedCallback,
      return_deeplink,
      custom_fields,
      return_params,
      payout,
      lifetime,
      qr_image_template,
      hash,
    };

    console.log("📦 Payload sent to PayWay:", payload);

    const response = await fetch(
      "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/generate-qr",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    console.log("✅ PayWay QR generated:", result);

    // ✅ Save payment info under user’s subcollection
    await db
      .collection("users")
      .doc(uid)
      .collection("payments")
      .doc(tran_id)
      .set({
        tran_id,
        amount,
        currency,
        status: "1", // pending
        created_at: new Date().toISOString(),
        response: result,
      });

    console.log(`💾 Saved payment for user ${uid}, tran_id ${tran_id}`);

    return res.status(200).json({
      success: true,
      message: "Payment QR generated successfully",
      data: result,
    });
  } catch (error) {
    console.error("🔥 Error generating payment QR:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate payment QR",
      details: error.message || error.toString(),
    });
  }
});

export default router;
