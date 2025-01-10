import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Clean up existing data
    await prisma.rule.deleteMany();
    await prisma.community.deleteMany();
    // ... existing cleanup

    const user1 = await prisma.user.create({
      data: {
        name: 'Emily Parker',
        email: 'emily@example.com',
        password: await bcrypt.hash('password123', 10),
      },
    });

    // Create test communities
    const poetryCommunity = await prisma.community.create({
      data: {
        name: 'Modern Poetry',
        description: 'A community for modern poetry enthusiasts',
        creatorId: user1.id,
        rules: {
          create: [
            {
              title: 'Be Respectful',
              description: 'Treat all members with respect and kindness'
            },
            {
              title: 'Original Content Only',
              description: 'Only share poems you have written yourself'
            }
          ]
        },
        members: {
          connect: [{ id: user1.id }]
        },
        moderators: {
          connect: [{ id: user1.id }]
        }
      }
    });

    // Create a test poem in the community
    await prisma.poem.create({
      data: {
        title: 'Community First Poem',
        content: 'This is our first community poem\nSharing words together',
        authorId: user1.id,
        communityId: poetryCommunity.id
      }
    });

    console.log('Database seeded with community data');
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