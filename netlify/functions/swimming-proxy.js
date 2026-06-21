const https = require('node:https');

const API_BASE = process.env.SWIMMING_API_BASE_URL || 'https://csbsapi.saglik.gov.tr/api/app/portal-public';
const API_USER = process.env.SWIMMING_API_USER;
const API_PASSWORD = process.env.SWIMMING_API_PASSWORD;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const requestUpstream = (url, method, body, auth) => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);

    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        timeout: 15000,
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
      req.destroy(new Error('Upstream timeout after 15s'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (method !== 'GET' && method !== 'OPTIONS' && body) {
      req.write(body);
    }

    req.end();
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

    const prefix = '/.netlify/functions/swimming-proxy/';
    const path = event.path.startsWith(prefix) ? event.path.slice(prefix.length) : '';

    const query = event.rawQuery ? `?${event.rawQuery}` : '';
    const targetUrl = `${API_BASE}/${path}${query}`;

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
