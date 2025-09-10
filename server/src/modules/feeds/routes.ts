import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Parser from 'rss-parser';
import puppeteer from 'puppeteer';
import { z } from 'zod';

const prisma = new PrismaClient();
const parser = new Parser();

export async function feedRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    try {
      await (req as any).jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.get('/', async (req, reply) => {
    const userId = (req as any).user?.sub as string;
    const feeds = await prisma.feed.findMany({ 
      where: { userId },
      include: { group: true },
      orderBy: { createdAt: 'desc' }
    });
    return { feeds };
  });

  app.get('/groups', async (req, reply) => {
    const userId = (req as any).user?.sub as string;
    const groups = await prisma.group.findMany({ 
      where: { userId },
      include: { feeds: true },
      orderBy: { createdAt: 'asc' }
    });
    return { groups };
  });

  app.post('/import', async (req, reply) => {
    const schema = z.object({ url: z.string().url() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid url' });

    const userId = (req as any).user?.sub as string;

    const { url } = parsed.data;
    
    try {
      const feedData = await parser.parseURL(url);
      console.log('RSS Feed Data:', {
        title: feedData.title,
        link: feedData.link,
        description: feedData.description,
        itemsCount: feedData.items?.length || 0
      });
      
      // 尝试从多个字段获取标题
      const feedTitle = feedData.title || 
                       feedData.link?.replace(/^https?:\/\//, '').replace(/\/$/, '') || 
                       '未命名订阅源';
      
      const feed = await prisma.feed.create({ 
        data: { 
          userId, 
          url, 
          title: feedTitle 
        } 
      });

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
    } catch (error) {
      console.error('RSS Import Error:', error);
      return reply.code(500).send({ 
        error: 'Failed to import RSS feed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/:id/items', async (req, reply) => {
    const { id } = req.params as { id: string };
    const items = await prisma.item.findMany({ where: { feedId: id }, orderBy: { published: 'desc' } });
    return { items };
  });

  // 删除订阅源
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).user?.sub as string;
    
    try {
      // 先删除相关的文章
      await prisma.item.deleteMany({ where: { feedId: id } });
      // 再删除订阅源
      await prisma.feed.delete({ where: { id, userId } });
      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete feed' });
    }
  });

  // 创建分组
  app.post('/groups', async (req, reply) => {
    const schema = z.object({ 
      name: z.string().min(1),
      color: z.string().optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload' });

    const userId = (req as any).user?.sub as string;
    const { name, color } = parsed.data;

    try {
      const group = await prisma.group.create({
        data: { userId, name, color: color || '#3b82f6' }
      });
      return group;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to create group' });
    }
  });

  // 更新订阅源分组
  app.patch('/:id/group', async (req, reply) => {
    const { id } = req.params as { id: string };
    const schema = z.object({ groupId: z.string().nullable() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload' });

    const userId = (req as any).user?.sub as string;
    const { groupId } = parsed.data;

    try {
      const feed = await prisma.feed.update({
        where: { id, userId },
        data: { groupId }
      });
      return feed;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to update feed group' });
    }
  });

  // 获取分组的所有文章
  app.get('/groups/:groupId/items', async (req, reply) => {
    const { groupId } = req.params as { groupId: string };
    const userId = (req as any).user?.sub as string;

    try {
      const items = await prisma.item.findMany({
        where: {
          feed: {
            groupId,
            userId
          }
        },
        include: {
          feed: {
            select: {
              id: true,
              title: true,
              group: {
                select: {
                  id: true,
                  name: true,
                  color: true
                }
              }
            }
          }
        },
        orderBy: { published: 'desc' }
      });
      return { items };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to load group items' });
    }
  });

  // 网页转 RSS 功能
  app.post('/webpage-to-rss', async (req, reply) => {
    const schema = z.object({ 
      url: z.string().url(),
      selectors: z.object({
        title: z.string(),
        content: z.string(),
        link: z.string().optional(),
        time: z.string().optional()
      })
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload' });

    const { url, selectors } = parsed.data;
    const userId = (req as any).user?.sub as string;

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });

      // 使用选择器抓取内容
      const scrapedData = await page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel.title);
        const items = [];
        
        for (let i = 0; i < Math.min(elements.length, 10); i++) {
          const element = elements[i];
          const title = element.textContent?.trim() || '';
          const link = element.closest('a')?.href || '';
          
          // 尝试找到对应的内容
          const contentEl = element.closest('*')?.querySelector(sel.content);
          const content = contentEl?.textContent?.trim() || '';
          
          // 尝试找到时间
          const timeEl = element.closest('*')?.querySelector(sel.time);
          const time = timeEl?.textContent?.trim() || new Date().toISOString();
          
          if (title) {
            items.push({ title, content, link, time });
          }
        }
        
        return items;
      }, selectors);

      await browser.close();

      // 创建 Feed
      const feed = await prisma.feed.create({ 
        data: { 
          userId, 
          url, 
          title: `网页抓取: ${new URL(url).hostname}` 
        } 
      });

      // 保存抓取的文章
      for (const item of scrapedData) {
        await prisma.item.create({
          data: {
            feedId: feed.id,
            title: item.title,
            content: item.content,
            link: item.link,
            published: new Date(item.time),
          }
        });
      }

      return { id: feed.id, items: scrapedData };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to scrape webpage' });
    }
  });

  // 获取网页预览（用于选择器测试）
  app.post('/webpage-preview', async (req, reply) => {
    const schema = z.object({ url: z.string().url() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid url' });

    const { url } = parsed.data;

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });

      // 获取页面标题和可能的文章元素
      const pageInfo = await page.evaluate(() => {
        const title = document.title;
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
          .map(h => ({ text: h.textContent?.trim(), tag: h.tagName }));
        const links = Array.from(document.querySelectorAll('a[href]'))
          .slice(0, 10)
          .map(a => ({ text: a.textContent?.trim(), href: a.href }));
        
        return { title, headings, links };
      });

      await browser.close();
      return pageInfo;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to preview webpage' });
    }
  });
}

