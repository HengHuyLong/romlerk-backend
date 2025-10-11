import express from "express";
import cors from "cors";
import compression from "compression"; // for gzip response compression
import helmet from "helmet"; // for basic security headers
import { verifyFirebaseToken } from "./middleware/auth.js";
import userRoutes from "./routes/users.js";
import documentRoutes from "./routes/documents.js";

const app = express();

// Enable gzip compression (reduces payload size by ~70%)
app.use(compression());

// Secure common HTTP headers (prevents common attacks)
app.use(helmet());

// Enable CORS (allow mobile app & web clients)
app.use(cors({
  origin: "*", // you can restrict to your frontend domain later
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Parse JSON payloads with size limit to prevent abuse
app.use(express.json({ limit: "256kb" }));

// Health check route
app.get("/", (req, res) => {
  res.send("Romlerk backend running ✅");
});

// Auth test route
app.get("/secure", verifyFirebaseToken, (req, res) => {
  res.json({
    message: "You are authenticated!",
    uid: req.user.uid,
    phone: req.user.phone,
  });
});

// user routes
app.use("/users", userRoutes);
// documents route
app.use("/documents", documentRoutes);

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
