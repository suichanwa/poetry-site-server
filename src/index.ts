import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { initWebSocket } from "../services/websocket.service";
import authRoutes from "../routes/auth.routes";
import userRoutes from "../routes/user.routes";
import poemRoutes from "../routes/poem.routes";
import followRoutes from "../routes/follow.routes";
import communityRoutes from "../routes/community.routes";
import notificationRoutes from "../routes/notification.routes";
import chatRoutes from "../routes/chat.routes";
import mangaRoutes from "../routes/manga.routes";
import lightNovelRoutes from "../routes/lightNovel.routes";
import bookRoutes from "../routes/book.routes";
import ratingRoutes from "../routes/rating.routes";
import lightNovelRatingRoutes from "../routes/lightNovelRating.routes";

dotenv.config();

// Define __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3001;

// Initialize WebSocket server
initWebSocket(server);

// CORS configuration
const corsOptions = {
  origin: "http://localhost:5173", // Allow requests ONLY from your frontend origin
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin", // Explicitly allow Origin header
  ],
};

// Middleware setup
app.use(cors(corsOptions)); // Use the cors middleware with the specified options
app.use(express.json());

// Helmet configuration
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          `http://localhost:${port}`,
          "http://localhost:5173",
        ], // Allow images from localhost:3001, data: URLs, and blob: URLs
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: [
          "'self'",
          "ws:",
          "wss:",
          `http://localhost:${port}`,
          "http://localhost:5173",
        ], // Allow WebSocket connections
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      },
    },
  })
);

app.use(morgan("combined"));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the uploads directory with specific headers
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Methods", "GET"); // Only allow GET for images
    res.setHeader("Access-Control-Allow-Headers", "Content-Type"); // Allow Content-Type header
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "../uploads"))
);

// Route to list contents of the uploads directory (Optional, for debugging)
app.get("/uploads", (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read uploads directory" });
    }
    res.json(files);
  });
});

// API Routes
app.use('/uploads', express.static(uploadsDir));
app.use("/api/auth", authRoutes);
app.use("/api/poems", poemRoutes);
app.use("/api/users", userRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/manga", mangaRoutes);
app.use("/api/lightnovels", lightNovelRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/rating", ratingRoutes);
app.use("/api/rating", lightNovelRatingRoutes);

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});