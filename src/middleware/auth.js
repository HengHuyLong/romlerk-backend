import { auth } from "../config/firebase.js";

/**
 * Middleware to verify Firebase ID token and attach user data to request.
 */
export async function verifyFirebaseToken(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const idToken = header.split("Bearer ")[1];
    const decoded = await auth.verifyIdToken(idToken);

    req.user = { uid: decoded.uid, phone: decoded.phone_number };
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
}