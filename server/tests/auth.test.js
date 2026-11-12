import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, auth, createAccount } from './helpers.js';

describe('auth', () => {
  it('registers, logs in, and returns the current user', async () => {
    const created = await request(app).post('/api/auth/register').send({
      name: 'Nusrat Rahman',
      email: 'nusrat@farmcity.test',
      phone: '+8801712345678',
      password: 'Password1',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.user.phone).toBe('01712345678');
    expect(created.body.data.user.role).toBe('customer');
    expect(created.body.data.accessToken).toBeTruthy();
    expect(created.headers['set-cookie']?.join(';')).toContain('refreshToken');

    const me = await request(app).get('/api/auth/me').set(auth(created.body.data.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('nusrat@farmcity.test');

    const login = await request(app).post('/api/auth/login').send({
      identifier: '01712345678',
      password: 'Password1',
    });
    expect(login.status).toBe(200);

    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', created.headers['set-cookie']);
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.accessToken).toBeTruthy();
  });

  it('rejects a wrong password and a duplicate email', async () => {
    await createAccount({ email: 'a@farmcity.test', phone: '01810000001' });
    const dup = await request(app).post('/api/auth/register').send({
      name: 'Other',
      email: 'a@farmcity.test',
      phone: '01910000001',
      password: 'Password1',
    });
    expect(dup.status).toBe(409);
    const bad = await request(app).post('/api/auth/login').send({
      identifier: 'a@farmcity.test',
      password: 'wrong-pass',
    });
    expect(bad.status).toBe(401);
  });

  it('blocks customers from admin routes', async () => {
    const { token } = await createAccount();
    const response = await request(app).get('/api/admin/overview').set(auth(token));
    expect(response.status).toBe(403);
    const missing = await request(app).get('/api/admin/overview');
    expect(missing.status).toBe(401);
  });
});
