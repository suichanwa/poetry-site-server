import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Delete data in correct order (respecting foreign key constraints)
    await prisma.notification.deleteMany();
    await prisma.notificationPreferences.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.bookmark.deleteMany();
    await prisma.page.deleteMany();
    await prisma.chapter.deleteMany();
    await prisma.lightNovelChapter.deleteMany();
    await prisma.message.deleteMany();
    await prisma.chat.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.threadComment.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.rule.deleteMany();
    await prisma.communityPost.deleteMany();
    await prisma.poem.deleteMany();
    await prisma.manga.deleteMany();
    await prisma.lightNovel.deleteMany();
    await prisma.digitalProduct.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.community.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();

    // Create initial test user
    const user1 = await prisma.user.create({
      data: {
        name: 'Emily Parker',
        email: 'emily@example.com',
        password: await bcrypt.hash('password123', 10),
      }
    });

    console.log('Database has been reset and seeded');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });