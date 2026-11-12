import http from 'http';
import { app } from './app.js';
import { connectDb } from './config/db.js';
import { assertProductionSecrets, env } from './config/env.js';
import { attachSocket } from './socket/index.js';

assertProductionSecrets();
const server = http.createServer(app);
attachSocket(server);

if (typeof globalThis.PhusionPassenger !== 'undefined') {
  globalThis.PhusionPassenger.configure({ autoInstall: false });
  server.listen('passenger');
  console.log('Farm City API listening on Passenger');
} else {
  server.listen(env.port, '0.0.0.0', () => {
    console.log(`Farm City API listening on ${env.port}`);
  });
}

connectDb().catch((err) => {
  console.error('Database connection failed:', err?.name || 'Error');
});
