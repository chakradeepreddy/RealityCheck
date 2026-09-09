import { buildApp } from './app';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = parseInt(process.env.PORT || '3001', 10);

const app = buildApp();

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`API server listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
