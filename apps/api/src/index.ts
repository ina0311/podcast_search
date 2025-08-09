import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { env } from '@podcast_search/config';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';

import episodesRouter from './routes/episodes';
import searchRouter from './routes/search';

const app = new Hono();

// Middlewares
app.use('*', cors());
app.use('*', compress());
app.use('*', secureHeaders());

app.route('/episodes', episodesRouter);
app.route('/search', searchRouter);

app.notFound((c) => c.json({ error: 'Not Found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

const port = env.PORT;
console.log(`🚀 API listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });