import assert from 'node:assert';
import { test } from 'node:test';
import { createApp } from '../../apps/api/src/app';

test('GET /health endpoint returns HTTP 200 with status ok and service name', async () => {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Server address not resolved');
  }

  const port = address.port;
  try {
    const res = await fetch(`http://localhost:${port}/health`);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'razorrecover-api');
    assert.ok(data.timestamp);
  } finally {
    server.close();
  }
});
