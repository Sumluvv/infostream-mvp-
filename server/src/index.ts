import Fastify from 'fastify';
import cors from '@fastify/cors';

const buildServer = () => {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });

  app.get('/health', async () => ({ status: 'ok' }));

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
