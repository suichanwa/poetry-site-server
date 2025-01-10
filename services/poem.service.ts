// server/services/poem.service.ts
import { PrismaClient } from '@prisma/client';
import { notificationService } from './notification.service';

const prisma = new PrismaClient();

export const poemService = {
  // Get poems with common includes
  async getPoemsWithDetails(where = {}) {
    return prisma.poem.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        tags: true,
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });
  },

  // Get single poem with details
  async getPoemById(poemId: number) {
    const poem = await prisma.poem.findUnique({
      where: { id: poemId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        comments: {
          include: {
            user: {
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
        },
        tags: true
      }
    });

    return poem ? {
      ...poem,
      formatting: poem.formatting ? JSON.parse(poem.formatting as string) : null
    } : null;
  },

  // Handle likes
  async toggleLike(poemId: number, userId: number) {
    const existingLike = await prisma.like.findFirst({
      where: {
        poemId,
        userId,
        commentId: null
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id }
      });
    } else {
      const poem = await this.getPoemById(poemId);
      if (!poem) throw new Error('Poem not found');

      await prisma.like.create({
        data: {
          userId,
          poemId,
        }
      });

      if (poem.author.id !== userId) {
        await notificationService.createNotification({
          type: 'LIKE',
          content: `Someone liked your poem "${poem.title}"`,
          recipientId: poem.author.id,
          senderId: userId,
          poemId: poemId,
          link: `/poem/${poemId}`
        });
      }
    }

    const likeCount = await prisma.like.count({
      where: { poemId, commentId: null }
    });

    return { 
      liked: !existingLike,
      likeCount 
    };
  },

  // Handle comments
  async addComment(poemId: number, userId: number, content: string) {
    return prisma.comment.create({
      data: {
        content,
        userId,
        poemId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  },

  async getBookmarkStatus(userId: number, poemId: number) {
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_poemId: { userId, poemId }
      }
    });
    
    return { bookmarked: !!bookmark };
  },

  async toggleBookmark(userId: number, poemId: number) {
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_poemId: { userId, poemId }
      }
    });

    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: {
          userId_poemId: { userId, poemId }
        }
      });
      return { bookmarked: false };
    }

    await prisma.bookmark.create({
      data: { userId, poemId }
    });
    return { bookmarked: true };
  }
};