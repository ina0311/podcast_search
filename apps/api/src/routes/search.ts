import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = new Hono();

router.get('/', async (c) => {
  const q = c.req.query('q') || '';
  if (q.trim() === '') return c.json({ episodes: [] });

  const episodes = await prisma.podcastEpisode.findMany({
    where: {
      OR: [
        { title: { contains: q } },
        { transcripts: { some: { text: { contains: q } } } },
      ],
    },
    take: 10,
  });

  return c.json({ episodes });
});

export default router; 