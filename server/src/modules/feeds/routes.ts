import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Parser from 'rss-parser';
import { z } from 'zod';

const prisma = new PrismaClient();
const parser = new Parser();

export async function feedRoutes(app: FastifyInstance) {
  app.post('/import', async (req, reply) => {
    const schema = z.object({ url: z.string().url() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid url' });

    // TODO: replace with real auth; for now accept x-user-id header
    const userId = (req.headers['x-user-id'] as string) || '';
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const { url } = parsed.data;
    const feedData = await parser.parseURL(url);
    const feed = await prisma.feed.create({ data: { userId, url, title: feedData.title || null } });

    if (feedData.items?.length) {
      const toCreate = feedData.items.slice(0, 100).map((it) => ({
        feedId: feed.id,
        guid: it.guid || null,
        link: it.link || null,
        title: it.title || null,
        content: (it.contentSnippet || it.content) || null,
        published: it.isoDate ? new Date(it.isoDate) : null,
      }));
      for (const data of toCreate) {
        await prisma.item.upsert({
          where: { guid: data.guid ?? `guid:${Math.random()}` },
          create: data,
          update: data,
        });
      }
    }

    return { id: feed.id };
  });

  app.get('/:id/items', async (req, reply) => {
    const { id } = req.params as { id: string };
    const items = await prisma.item.findMany({ where: { feedId: id }, orderBy: { published: 'desc' } });
    return { items };
  });
}

