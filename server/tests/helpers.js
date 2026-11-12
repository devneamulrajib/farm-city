import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { app } from '../src/app.js';
import { connectDb } from '../src/config/db.js';
import { User } from '../src/models/User.js';

beforeAll(async () => {
  await connectDb();
  await Promise.all(Object.values(mongoose.models).map((model) => model.createIndexes()));
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});

export { app };

export async function createAccount({
  name = 'Test User',
  email = 'user@farmcity.test',
  phone = '01710000001',
  password = 'Password1',
  role = 'customer',
} = {}) {
  const user = await User.create({ name, email, phone, password, role });
  const response = await request(app).post('/api/auth/login').send({ identifier: email, password });
  return { user, token: response.body.data.accessToken, response };
}

export function auth(token) {
  return { Authorization: `Bearer ${token}` };
}
