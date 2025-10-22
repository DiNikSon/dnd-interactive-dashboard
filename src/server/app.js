import express, { json, urlencoded} from "express";
import path, { join } from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import logger from "morgan";

import apiRouter from "./routes/api.js";
import uploadRouter from "./routes/upload.js";
import syncRouter from "./routes/sync.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(logger("dev"));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(cookieParser());

// mount our api router here
app.use("/api", apiRouter);
app.use("/upload", uploadRouter);
app.use("/sync", syncRouter);

// Serve static files from the React app
app.use(express.static(join(__dirname, "../client/build/client")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/src", express.static(path.join(__dirname, "public/assets")));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  console.log("req.path", req.path);
  res.sendFile(join(__dirname, "../client/build/index.html"));
});

export default app;
