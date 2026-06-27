import http from 'node:http';
import { demoData } from './mock-data.mjs';

const port = Number(process.env.PORT || 18081);

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({ rawBody: body });
      }
    });
  });
}

function routeGet(pathname, searchParams, res) {
  if (pathname === '/api/admin/users') {
    sendJson(res, 200, { code: 0, msg: 'ok', data: demoData.adminUsers });
    return true;
  }

  const userMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch) {
    const user = demoData.adminUsers.find((item) => item.id === userMatch[1]);
    sendJson(res, user ? 200 : 404, user
      ? { code: 0, msg: 'ok', data: user }
      : { code: 404, msg: 'user not found', data: null });
    return true;
  }

  if (pathname === '/api/admin/audits') {
    const type = searchParams.get('type') || 'avatar';
    sendJson(res, 200, { code: 0, msg: 'ok', data: demoData.audits[type] || [] });
    return true;
  }

  if (pathname === '/api/admin/access-config') {
    sendJson(res, 200, { code: 0, msg: 'ok', data: demoData.accessConfig });
    return true;
  }

  if (pathname === '/api/miniapp/profile') {
    sendJson(res, 200, { code: 0, msg: 'ok', data: demoData.miniappProfile });
    return true;
  }

  if (pathname === '/api/miniapp/verification/status') {
    sendJson(res, 200, { code: 0, msg: 'ok', data: demoData.verificationStatus });
    return true;
  }

  if (pathname === '/health') {
    sendJson(res, 200, { code: 0, msg: 'bobo_demo mock server healthy', data: { port } });
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && routeGet(url.pathname, url.searchParams, res)) {
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/demo/action') {
    const body = await readBody(req);
    sendJson(res, 200, {
      code: 0,
      msg: 'demo action accepted',
      data: {
        actionId: `ACT-${Date.now()}`,
        action: body.action || 'unknown',
        targetId: body.targetId || '',
        received: body,
        effect: '仅模拟成功结果，不写数据库',
      },
    });
    return;
  }

  sendJson(res, 404, { code: 404, msg: 'route not found', data: null });
});

server.listen(port, () => {
  console.log(`bobo_demo mock server listening on http://localhost:${port}`);
});
