import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';

const app = createApp();

describe('khung app', () => {
  it('GET /api/health trả { ok: true }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('đường dẫn không tồn tại trả 404 NOT_FOUND dạng JSON', async () => {
    for (const path of ['/api/khong-co', '/khong-phai-api']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn này' } });
    }
  });

  it('body JSON hỏng trả 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"hong":');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', fields: { _: 'Body phải là JSON hợp lệ' } });
  });

  it('body quá 1 MB trả 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ x: 'a'.repeat(1_100_000) }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Dữ liệu gửi lên quá lớn');
  });

  it('CORS chỉ cho phép CORS_ORIGIN, kèm credentials', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');

    // Origin lạ: header vẫn chỉ ghi origin được phép, nên trình duyệt chặn response.
    const other = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(other.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(other.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });

  it('có header bảo mật của helmet, không lộ X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
