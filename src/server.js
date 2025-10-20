// src/server.js
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
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "256kb" }));

// ────────────── Routes ──────────────
app.get("/", (req, res) => res.send("✅ Romlerk backend running"));

app.get("/secure", verifyFirebaseToken, (req, res) => {
  res.json({
    message: "You are authenticated!",
    uid: req.user.uid,
    phone: req.user.phone,
  });
});

app.use("/users", userRoutes);
app.use("/documents", documentRoutes);
app.use("/profiles", profileRoutes);
app.use("/payment", paymentRoutes);
app.use("/payment/callback", paymentStatusRoutes);

// 🧾 Log-only route for ABA redirect results
app.get("/payment/after", (req, res) => {
  const { state, tran_id } = req.query;

  // 👇 Add your console logs here
  console.log("💬 [ABA Redirect Result]");
  console.log("Transaction ID:", tran_id);
  console.log("Payment State:", state);

  // Optional: respond with minimal text to confirm receipt
  res.send("OK");
});

export default app;
