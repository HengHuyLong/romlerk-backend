import dotenv from "dotenv";
import app from "./src/server.js";

dotenv.config();

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Romlerk backend running on http://localhost:${PORT}`);
});
