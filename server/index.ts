import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import routes from "./routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const clientBuildDirectory = join(serverDirectory, "..", "dist");
const clientIndexFile = join(clientBuildDirectory, "index.html");

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use("/api", routes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

if (process.env.NODE_ENV === "production" && existsSync(clientIndexFile)) {
  app.use(express.static(clientBuildDirectory));
  app.get("/{*splat}", (req, res) => {
    res.sendFile(clientIndexFile);
  });
}

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
