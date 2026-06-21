const https = require('node:https');

const API_BASE = process.env.SWIMMING_API_BASE_URL || 'https://csbsapi.saglik.gov.tr/api/app/portal-public';
const API_USER = process.env.SWIMMING_API_USER;
const API_PASSWORD = process.env.SWIMMING_API_PASSWORD;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

// Custom HTTPS agent with improved TCP settings
const agent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 45000,
});

const requestUpstream = (url, method, body, auth, retries = 3) => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);

    const makeRequest = () => {
      const req = https.request(
        {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port || 443,
          path: `${parsed.pathname}${parsed.search}`,
          method,
          agent,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
            'User-Agent': 'AeroGuard-Proxy/1.0 (Node.js)',
            'Connection': 'keep-alive',
            'Accept': 'application/json',
          },
          timeout: 45000,
        },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode || 500,
              contentType: res.headers['content-type'] || 'application/json',
              body: data,
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        if (retries > 0) {
          console.log(`[swimming-proxy] Timeout (${4 - retries}/3 retries), retrying...`);
          requestUpstream(url, method, body, auth, retries - 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Upstream timeout after 45s (max retries)'));
        }
      });

      req.on('error', (err) => {
        if (retries > 0 && (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ENOTFOUND')) {
          console.log(`[swimming-proxy] Connection error: ${err.code}, retrying... (${4 - retries}/3)`);
          setTimeout(() => {
            requestUpstream(url, method, body, auth, retries - 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (4 - retries)); // exponential backoff
        } else {
          reject(err);
        }
      });

      if (method !== 'GET' && method !== 'OPTIONS' && body) {
        req.write(body);
      }

      req.end();
    };

    makeRequest();
  });
};

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    if (!API_USER || !API_PASSWORD) {
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Swimming proxy is not configured',
          detail: 'Missing SWIMMING_API_USER or SWIMMING_API_PASSWORD environment variable.',
        }),
      };
    }

    // Parse path: handle both redirect format and direct function path
    let path = '';
    
    if (event.path.startsWith('/.netlify/functions/swimming-proxy/')) {
      path = event.path.slice('/.netlify/functions/swimming-proxy/'.length);
    } else if (event.path.startsWith('/api/swimming/')) {
      path = event.path.slice('/api/swimming/'.length);
    } else {
      // Fallback: treat entire path as endpoint
      path = event.path.replace(/^\/+/, '');
    }

    const query = event.rawQuery ? `?${event.rawQuery}` : '';
    const targetUrl = `${API_BASE}/${path}${query}`;
    
    console.log(`[swimming-proxy] path=${event.path}, resolved=${path}, url=${targetUrl}`);

    const auth = Buffer.from(`${API_USER}:${API_PASSWORD}`).toString('base64');

    const upstream = await requestUpstream(targetUrl, event.httpMethod, event.body, auth);

    return {
      statusCode: upstream.statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.contentType,
      },
      body: upstream.body,
    };
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Swimming proxy failed',
        detail,
      }),
    };
  }
};
