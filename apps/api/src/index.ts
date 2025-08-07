import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { config } from 'dotenv';
config();

import episodesRouter from './routes/episodes';
import searchRouter from './routes/search';

const app = new Hono();

// Enable CORS for all routes
app.use('*', cors());

app.route('/episodes', episodesRouter);
app.route('/search', searchRouter);

const port = Number(process.env.PORT) || 3000;
console.log(`🚀 API listening on http://localhost:${port}`);

serve({ port }, app); 