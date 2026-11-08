const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

test('API routes enforce authentication, validate requests and report database health accurately', async () => {
  const server = app.listen(0);
  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const checks = [
      ['/api/health', 503],
      ['/api/services/admin/all', 401],
      ['/api/services/admin/gallery', 401],
      ['/api/appointments/mine', 401],
      ['/api/admin/overview', 401],
      ['/api/auth/me', 401],
      ['/api/auth/login', 400, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
      ['/api/auth/register', 400, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
      ['/api/appointments/availability', 400],
      ['/api/appointments', 400, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
    ];

    for (const [path, status, options] of checks) {
      const response = await fetch(`${baseUrl}${path}`, options);
      assert.equal(response.status, status, `${path} should return HTTP ${status}`);
      if (path === '/api/health') {
        const health = await response.json();
        assert.deepEqual(health, { status: 'unavailable', database: 'disconnected' });
      }
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
