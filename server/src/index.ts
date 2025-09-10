import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { authRoutes } from './modules/auth/routes';

dotenv.config();

const buildServer = () => {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });

  app.get('/health', async () => ({ status: 'ok' }));
  app.register(authRoutes, { prefix: '/api/auth' });

  return app;
};

const start = async () => {
  const app = buildServer();
  const port = Number(process.env.PORT || 3001);
  await app.listen({ port, host: '0.0.0.0' });
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
