import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = new Hono();

router.get('/', async (c) => {
  const episodes = await prisma.podcastEpisode.findMany();
  return c.json({ episodes });
});

router.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const episode = await prisma.podcastEpisode.findUnique({
    where: { id },
    include: { transcripts: true },
  });
  if (!episode) return c.json({ error: 'Not found' }, 404);
  return c.json(episode);
});

export default router; 