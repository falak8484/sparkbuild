const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = __dirname;
const env = loadEnv(path.join(root, '.env'));
const PORT = Number(env.PORT || 8000);

const SYSTEM_ANALYZE = `You are the planning brain for SparkBuild, a premium AI website builder.
Return strict JSON only.
Schema:
{
  "needsQuestions": true,
  "websiteType": "bakery|ecommerce|portfolio|business|college|landing|birthday|anniversary|blog|creative|restaurant|wellness|flower",
  "websiteName": "",
  "tone": "",
  "styleKeywords": [""],
  "imageKeywords": [""],
  "missingDetails": [{"id":"websiteName","label":"What should the website be called?","placeholder":"Maison Bloom"}],
  "notes": ""
}
Rules:
- Ask 2 to 5 follow-up questions when details are missing.
- Always ask for website name if unclear.
- For ecommerce/bakery/restaurant ask what products or menu items must be shown.
- For business/landing/portfolio ask for main call to action or primary conversion goal.
- For birthday/anniversary ask who it is for and what tone or message style they want.
- Keep the questions natural, short, and useful.
- Infer an expensive, polished, visually rich style by default.
- Return JSON only.`;

const SYSTEM_GENERATE = `You are the generation brain for SparkBuild, a premium AI website builder.
Return strict JSON only.
Schema:
{
  "websiteType": "",
  "title": "",
  "tagline": "",
  "layoutVariant": "editorial|immersive|catalog|storybook|showcase|signature",
  "palette": {"primary":"#hex","bg":"#hex","surface":"#hex","accent":"#hex","text":"#hex"},
  "vibes": ["luxury","soft","editorial"],
  "pages": [
    {
      "name": "Home",
      "slug": "index",
      "sections": [
        {
          "type": "hero|features|products|gallery|testimonials|about|contact|cards|text",
          "variant": "string",
          "heading": "",
          "title": "",
          "tagline": "",
          "text": "",
          "body": "",
          "buttonText": "",
          "secondaryButtonText": "",
          "imageQuery": "",
          "items": [{"title":"","text":"","icon":"","imageQuery":""}],
          "cards": [{"title":"","text":""}],
          "products": [{"name":"","price":"","desc":"","imageQuery":""}],
          "images": ["query one","query two","query three"],
          "email": "",
          "phone": "",
          "address": ""
        }
      ]
    }
  ],
  "adminPanel": {"enabled": true, "sections": ["orders","inventory","customers","analytics"], "accent": "#hex"}
}
Rules:
- Make every website feel unique. Do not reuse the same structure for different prompts.
- Choose one layoutVariant and use section variants that fit it.
- Premium by default: layered visuals, richer copy, luxury aesthetics, image-heavy sections.
- Use at most 5 pages.
- For selling sites include products or menu items with realistic prices.
- For birthday/anniversary use warmer and more emotional copy.
- For landing pages use stronger CTA language.
- Enable adminPanel for ecommerce, bakery, or restaurant.
- Return JSON only.`;

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

function hasKey(name) {
  return Boolean(env[name] && String(env[name]).trim());
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function text(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

async function readJsonBody(req) {
  return await new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 4 * 1024 * 1024) reject(new Error('Request too large'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function callLLM(userPrompt, systemPrompt) {
  const provider = (env.LLM_PROVIDER || (hasKey('OPENAI_API_KEY') ? 'openai' : 'groq')).toLowerCase();
  const model = env.LLM_MODEL || (provider === 'openai' ? 'gpt-4.1-mini' : 'llama-3.3-70b-versatile');

  if (provider === 'openai' && hasKey('OPENAI_API_KEY')) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model,
        temperature: 0.9,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '{}';
  }

  if (hasKey('GROQ_API_KEY')) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model,
        temperature: 0.85,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) throw new Error(`Groq error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '{}';
  }

  throw new Error('No LLM key configured. Add a fresh GROQ_API_KEY or OPENAI_API_KEY to .env');
}

function safeJsonParse(textValue, fallback) {
  try { return JSON.parse(textValue); } catch { return fallback; }
}

function heuristicAnalyze(prompt) {
  const lower = String(prompt || '').toLowerCase();
  const detect = [
    ['birthday', /(birthday|bday|anniversary|surprise|gift|romantic)/],
    ['bakery', /(bakery|cake|pastry|dessert|bread|croissant)/],
    ['ecommerce', /(ecommerce|store|shop|sell|products|jewelry|fashion|merch)/],
    ['portfolio', /(portfolio|designer|photographer|developer|artist|freelancer)/],
    ['college', /(college|school|academy|university|courses|faculty)/],
    ['landing', /(landing|startup|app|saas|campaign|ad|launch|product|perfume)/],
    ['blog', /(blog|writer|journal|posts|articles)/],
    ['wellness', /(wellness|spa|yoga|skincare|fitness|beauty)/],
    ['flower', /(flower|florist|bouquet|bloom)/],
    ['restaurant', /(restaurant|cafe|food|menu|dining)/],
  ];
  const websiteType = (detect.find(([, rx]) => rx.test(lower)) || ['business'])[0];
  const missingDetails = [];
  if (!/(called|named|brand|website name)/i.test(prompt) && !/"[^"]+"/.test(prompt)) {
    missingDetails.push({ id: 'websiteName', label: 'What should the website be called?', placeholder: 'Maison Bloom' });
  }
  if (/(birthday|anniversary|gift|romantic)/i.test(prompt)) {
    missingDetails.push({ id: 'personName', label: 'Who is this website for?', placeholder: 'Aarohi' });
    missingDetails.push({ id: 'messageStyle', label: 'Do you want the message to feel cute, emotional, funny, or romantic?', placeholder: 'Cute and emotional' });
  }
  if (/(store|shop|bakery|restaurant|wellness|business|landing|portfolio)/i.test(prompt)) {
    missingDetails.push({ id: 'offerings', label: 'What products, services, or highlights should be shown?', placeholder: 'Custom cakes, pastries, coffee' });
  }
  if (/(landing|business|portfolio|college|ecommerce)/i.test(prompt)) {
    missingDetails.push({ id: 'cta', label: 'What should people do on the website?', placeholder: 'Order now' });
  }
  return {
    needsQuestions: missingDetails.length > 0,
    websiteType,
    websiteName: '',
    tone: 'luxury, soft, modern, animated',
    styleKeywords: ['luxury', 'soft', 'animated', 'premium', 'editorial'],
    imageKeywords: [websiteType, 'editorial', 'luxury', 'aesthetic'],
    missingDetails: missingDetails.slice(0, 5),
    notes: 'Heuristic analysis fallback used because AI analysis was unavailable.',
  };
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.md': 'text/markdown; charset=utf-8',
  }[ext] || 'application/octet-stream';
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const parsed = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = decodeURIComponent(parsed.pathname);

  if (pathname === '/api/health') {
    return json(res, 200, { ok: true, hasLLM: hasKey('GROQ_API_KEY') || hasKey('OPENAI_API_KEY'), hasPexels: hasKey('PEXELS_API_KEY') });
  }

  if (pathname === '/api/analyze' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const prompt = String(body.prompt || '').trim();
      if (!prompt) return json(res, 400, { error: 'Prompt required' });
      try {
        const result = await callLLM(prompt, SYSTEM_ANALYZE);
        const parsedJson = safeJsonParse(result, heuristicAnalyze(prompt));
        return json(res, 200, parsedJson);
      } catch {
        return json(res, 200, heuristicAnalyze(prompt));
      }
    } catch (error) {
      return json(res, 500, { error: error.message || 'Analyze failed' });
    }
  }

  if (pathname === '/api/generate' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const prompt = String(body.prompt || '').trim();
      const answers = body.answers || {};
      if (!prompt) return json(res, 400, { error: 'Prompt required' });
      const answerBlock = Object.entries(answers).filter(([, v]) => String(v || '').trim()).map(([k, v]) => `${k}: ${v}`).join('\n');
      const userPrompt = answerBlock ? `${prompt}\n\nExtra details from the user:\n${answerBlock}` : prompt;
      const result = await callLLM(userPrompt, SYSTEM_GENERATE);
      const parsedJson = safeJsonParse(result, null);
      if (!parsedJson || !Array.isArray(parsedJson.pages)) throw new Error('Invalid AI generation');
      return json(res, 200, parsedJson);
    } catch (error) {
      return json(res, 500, { error: error.message || 'Generation failed' });
    }
  }

  if (pathname === '/api/images' && req.method === 'GET') {
    const q = String(parsed.searchParams.get('q') || '').trim();
    const count = Math.min(Number(parsed.searchParams.get('count') || 8), 15);
    const seed = String(parsed.searchParams.get('seed') || Date.now());
    if (!q) return json(res, 200, { images: [] });
    if (!hasKey('PEXELS_API_KEY')) return json(res, 200, { images: [] });
    try {
      const page = Math.max(1, (seed.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 5) + 1);
      const apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${count}&orientation=landscape&page=${page}`;
      const response = await fetch(apiUrl, { headers: { Authorization: env.PEXELS_API_KEY } });
      if (!response.ok) throw new Error(`Pexels error ${response.status}`);
      const data = await response.json();
      const images = (data.photos || []).map(p => ({
        original: p.src?.large2x || p.src?.large || p.src?.medium,
        medium: p.src?.large || p.src?.medium,
        thumb: p.src?.medium || p.src?.small,
        photographer: p.photographer || '',
        alt: p.alt || q,
      })).filter(item => item.original);
      return json(res, 200, { images, seed });
    } catch (error) {
      return json(res, 200, { images: [], seed, error: error.message });
    }
  }

  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(root, safePath.replace(/^\/+/, ''));
  if (filePath.startsWith(root) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return text(res, 200, fs.readFileSync(filePath), contentType(filePath));
  }
  return text(res, 200, fs.readFileSync(path.join(root, 'index.html')), 'text/html; charset=utf-8');
}

http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    json(res, 500, { error: error.message || 'Server error' });
  });
}).listen(PORT, () => {
  console.log(`SparkBuild running at http://localhost:${PORT}`);
});
