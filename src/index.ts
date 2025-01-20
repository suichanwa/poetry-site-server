import express from 'express';
import cors from 'cors';
import helmet from 'helmet'; 
import morgan from 'morgan'; 
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initWebSocket } from '../services/websocket.service';
import authRoutes from '../routes/auth.routes';
import userRoutes from '../routes/user.routes';
import poemRoutes from '../routes/poem.routes';
import followRoutes from '../routes/follow.routes';
import communityRoutes from '../routes/community.routes';
import notificationRoutes from '../routes/notification.routes';
import chatRoutes from '../routes/chat.routes';
import mangaRoutes from '../routes/manga.routes';
import lightNovelRoutes from '../routes/lightNovel.routes';
import bookRoutes from '../routes/book.routes';

dotenv.config();

// Add these lines to define __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Create HTTP server
const server = createServer(app);
const port = process.env.PORT || 3001;

// Initialize WebSocket server
initWebSocket(server);

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob: *; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:;"
  );
  next();
});

// Middleware setup
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Disable crossOriginEmbedderPolicy
}));
app.use(morgan('combined'));

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the uploads directory with CORS and CORP headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir));

// Route to list contents of the uploads directory
app.get('/uploads', (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read uploads directory' });
    }
    res.json(files);
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/poems', poemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/manga', mangaRoutes);
app.use('/api/lightnovels', lightNovelRoutes);
app.use('/api/books', bookRoutes);

server.listen(port, () => {
  console.log(`Server running at http://localhost:3001`);
});