// server/src/index.ts
import express from 'express';
import cors from 'cors';
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
import communityRoutes from '../routes/cummunity.routes';
import notificationRoutes from '../routes/notification.routes';
import chatRoutes from '../routes/chat.routes';
import mangaRoutes from '../routes/manga.routes';
import lightNovelRoutes from '../routes/lightNovel.routes';

dotenv.config();

// Add these lines to define __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Create HTTP server
const server = createServer(app);
const port = process.env.PORT || 3000;

// Initialize WebSocket server
initWebSocket(server);

// Add CSP headers with WebSocket connection allowed
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob: *; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:;"
  );
  next();
});

// Rest of your middleware and route setup
app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static('uploads'));
app.use('/api/auth', authRoutes);
app.use('/api/poems', poemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/manga', mangaRoutes);
app.use('/api/lightnovels', lightNovelRoutes);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});