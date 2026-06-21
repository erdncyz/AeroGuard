const API_BASE = process.env.SWIMMING_API_BASE_URL || 'https://csbsapi.saglik.gov.tr/api/app/portal-public';
const API_USER = process.env.SWIMMING_API_USER;
const API_PASSWORD = process.env.SWIMMING_API_PASSWORD;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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

    const upstream = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: event.httpMethod === 'GET' ? undefined : event.body,
    });

    const body = await upstream.text();

    return {
      statusCode: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
      },
      body,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Swimming proxy failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
