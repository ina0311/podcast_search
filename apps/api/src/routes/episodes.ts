import { Hono } from 'hono';
import { prisma } from '@podcast_search/db';
import { z } from 'zod';
const router = new Hono();

router.get('/', async (c) => {
  const episodes = await prisma.podcastEpisode.findMany();
  return c.json({ episodes });
});

router.get('/:id', async (c) => {
  const idParam = c.req.param('id');
  const parsed = z.coerce.number().int().positive().safeParse(idParam);
  if (!parsed.success) {
    return c.json({ error: 'Invalid id' }, 400);
  }
  const id = parsed.data;
  const episode = await prisma.podcastEpisode.findUnique({
    where: { id },
    include: { transcripts: true },
  });
  if (!episode) return c.json({ error: 'Not found' }, 404);
  return c.json(episode);
});

export default router; 