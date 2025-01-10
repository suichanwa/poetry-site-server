// server/routes/chat.routes.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.id;

    // Input validation
    if (!participantId || typeof participantId !== 'number') {
      return res.status(400).json({ 
        message: "Invalid participant ID" 
      });
    }

    if (userId === participantId) {
      return res.status(400).json({ 
        message: "Cannot create chat with yourself" 
      });
    }

    // Check if participant exists
    const participant = await prisma.user.findUnique({
      where: { id: participantId }
    });

    if (!participant) {
      return res.status(404).json({
        message: "Participant not found"
      });
    }

    // Check if chat already exists
    const existingChat = await prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { id: userId } } },
          { participants: { some: { id: participantId } } }
        ]
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    // Create new chat
    const chat = await prisma.chat.create({
      data: {
        participants: {
          connect: [
            { id: userId },
            { id: participantId }
          ]
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ 
      message: 'Failed to create chat',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's chats
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            id: userId
          }
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        lastMessage: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Get single chat
router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const chatId = parseInt(req.params.id);
    const userId = req.user.id;

    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          some: {
            id: userId
          }
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        lastMessage: true
      }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Get chat messages
router.get('/:id/messages', authMiddleware, async (req: any, res) => {
  try {
    const chatId = parseInt(req.params.id);
    const userId = req.user.id;

    // Verify user is participant
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          some: {
            id: userId
          }
        }
      }
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to view these messages' });
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId: chatId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/messages', authMiddleware, async (req: any, res) => {
  try {
    const { chatId, content } = req.body;
    const userId = req.user.id;

    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify user is chat participant
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          some: {
            id: userId
          }
        }
      }
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to send messages in this chat' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        type: 'text',
        read: false,
        chat: {
          connect: { id: chatId }
        },
        sender: {
          connect: { id: userId }
        }
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    // Update chat's lastMessage and updatedAt
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        lastMessageId: message.id,
        updatedAt: new Date()
      }
    });

    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/messages/:id/read', authMiddleware, async (req: any, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user.id;

    const message = await prisma.message.update({
      where: {
        id: messageId,
        NOT: {
          senderId: userId // Only mark as read if user is not the sender
        }
      },
      data: {
        read: true
      }
    });

    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

export default router;