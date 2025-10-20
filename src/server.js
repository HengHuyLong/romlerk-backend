import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { verifyFirebaseToken } from "./middleware/auth.js";

import userRoutes from "./routes/users.js";
import documentRoutes from "./routes/documents.js";
import profileRoutes from "./routes/profiles.js";
import paymentRoutes from "./routes/payment.js";
import paymentStatusRoutes from "./routes/payment_status.js";

const app = express();

// ────────────── Middleware ──────────────
app.use(compression());
app.use(helmet());
app.use(
  cors({
    origin: "*", // ✅ allow all for now (restrict later in production)
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Parse both JSON and form-encoded payloads
// ABA sometimes sends callback data as x-www-form-urlencoded
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true }));

// ────────────── Routes ──────────────
app.get("/", (req, res) => res.send("✅ Romlerk backend running"));

app.get("/secure", verifyFirebaseToken, (req, res) => {
  res.json({
    message: "You are authenticated!",
    uid: req.user.uid,
    phone: req.user.phone,
  });
});

// 💾 Core App Routes
app.use("/users", userRoutes);
app.use("/documents", documentRoutes);
app.use("/profiles", profileRoutes);

// 💳 ABA PayWay Routes
app.use("/payment", paymentRoutes);                // 🔹 POST /payment (generate QR)
app.use("/payment/callback", paymentStatusRoutes); // 🔹 POST /payment/callback (ABA callback) + GET /payment/callback/status/:tran_id

// 🧾 Log-only route for ABA redirect results (debugging)
app.get("/payment/after", (req, res) => {
  const { state, tran_id } = req.query;

  console.log("💬 [ABA Redirect Result]");
  console.log("🔹 Transaction ID:", tran_id);
  console.log("🔹 Payment State:", state);

  // Optional simple response to confirm ABA redirect worked
  res.status(200).send(`✅ Received payment state: ${state} for tran_id: ${tran_id}`);
});

// ────────────── Export app for index.js ──────────────
export default app;
