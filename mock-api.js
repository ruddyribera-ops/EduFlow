// EduFlow mock API (Node, zero deps) — stand-in for Laravel backend during local dev.
// Covers: leads (list + update status), students, sections, guardians, auth stub.
// Validates pipeline status against the canonical enum, mirrors paginated shape.

const http = require('http');
const { randomUUID } = require('crypto');

const PIPELINE_STAGES = ['inquiry', 'tour_scheduled', 'application_sent', 'enrolled', 'lost'];
const COMM_PREFS = ['email_only', 'sms_only', 'both'];

const now = () => new Date().toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

// ---------- Seed data ----------
const users = [
  { id: 'u-admin', name: 'Admin User', email: 'admin@eduflow.test', role: 'admin' },
  { id: 'u-sarah', name: 'Sarah Connor', email: 'sarah@eduflow.test', role: 'counselor' },
  { id: 'u-emily', name: 'Emily Tan', email: 'emily@eduflow.test', role: 'counselor' },
  { id: 'u-tom', name: 'Tom Smith', email: 'tom@eduflow.test', role: 'teacher' },
  { id: 'u-lisa', name: 'Lisa Park', email: 'lisa@eduflow.test', role: 'teacher' },
];

const leads = [
  mkLead('Jennifer', 'Martinez', 'inquiry', 'Google Ads - K-5', null),
  mkLead('Christopher', 'Lee', 'tour_scheduled', 'Open House Event', daysAgo(2)),
  mkLead('Amanda', 'Garcia', 'application_sent', 'Referral - Current Parent', daysAgo(5)),
  mkLead('Daniel', 'Anderson', 'enrolled', 'Website Blog', daysAgo(10)),
  mkLead('Michelle', 'Taylor', 'lost', 'Facebook Campaign', null),
];

const guardians = [
  { id: 'g-1', first_name: 'Maria', last_name: 'Martinez', email: 'maria.m@email.com', phone: '+1-555-0101', communication_preference: 'both' },
  { id: 'g-2', first_name: 'David', last_name: 'Lee', email: 'david.l@email.com', phone: '+1-555-0102', communication_preference: 'email_only' },
  { id: 'g-3', first_name: 'Susan', last_name: 'Garcia', email: 'susan.g@email.com', phone: null, communication_preference: 'sms_only' },
];

const students = [
  { id: 's-1', first_name: 'Liam', last_name: 'Martinez', date_of_birth: '2015-04-11', grade_level: '3rd', enrollment_status: 'enrolled', guardians: [guardians[0]] },
  { id: 's-2', first_name: 'Olivia', last_name: 'Lee', date_of_birth: '2014-09-23', grade_level: '4th', enrollment_status: 'enrolled', guardians: [guardians[1]] },
  { id: 's-3', first_name: 'Noah', last_name: 'Garcia', date_of_birth: '2016-01-07', grade_level: '2nd', enrollment_status: 'applied', guardians: [guardians[2]] },
];

const sections = [
  { id: 'sec-1', name: '3rd Grade - A', grade_level: '3rd', room: '101', semester: 'fall', students_count: 1 },
  { id: 'sec-2', name: '4th Grade - B', grade_level: '4th', room: '202', semester: 'fall', students_count: 1 },
];

function mkLead(first, last, status, campaign, lastContacted) {
  const id = randomUUID();
  return {
    id,
    first_name: first,
    last_name: last,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@email.com`,
    phone: '+1-555-' + Math.floor(1000 + Math.random() * 9000),
    status,
    source_campaign: campaign,
    notes: null,
    assigned_counselor_id: null,
    last_contacted_at: lastContacted,
    enrolled_at: status === 'enrolled' ? daysAgo(1) : null,
    created_at: now(),
    updated_at: now(),
  };
}

// ---------- HTTP helpers ----------
function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => (buf += c));
    req.on('end', () => {
      if (!buf) return resolve({});
      try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
    });
  });
}

function paginate(items, req) {
  const url = new URL(req.url, 'http://localhost');
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '25', 10)));
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const start = (page - 1) * perPage;
  return {
    data: items.slice(start, start + perPage),
    meta: { total: items.length, per_page: perPage, current_page: page },
  };
}

// ---------- Routes ----------
const routes = [
  // Auth stub — returns a fake token for any known email.
  { method: 'POST', pattern: /^\/api\/auth\/login$/, handler: async (req, res) => {
      const { email } = await readBody(req);
      const user = users.find((u) => u.email === email);
      if (!user) return json(res, 401, { message: 'Invalid credentials' });
      return json(res, 200, { token: 'mock-' + user.id, user });
    } },

  { method: 'GET', pattern: /^\/api\/auth\/me$/, handler: (req, res) => {
      const auth = req.headers.authorization || '';
      const id = auth.replace('Bearer mock-', '');
      const user = users.find((u) => u.id === id);
      if (!user) return json(res, 401, { message: 'Unauthenticated' });
      return json(res, 200, { data: user });
    } },

  // Leads
  { method: 'GET', pattern: /^\/api\/leads(\?|$)/, handler: (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const status = url.searchParams.get('status');
      const campaign = url.searchParams.get('source_campaign');
      let filtered = leads;
      if (status) {
        if (!PIPELINE_STAGES.includes(status)) return json(res, 422, { message: 'Invalid status filter', errors: { status: ['invalid enum value'] } });
        filtered = filtered.filter((l) => l.status === status);
      }
      if (campaign) filtered = filtered.filter((l) => l.source_campaign === campaign);
      filtered = [...filtered].sort((a, b) => PIPELINE_STAGES.indexOf(a.status) - PIPELINE_STAGES.indexOf(b.status));
      return json(res, 200, paginate(filtered, req));
    } },

  { method: 'GET', pattern: /^\/api\/leads\/([^\/?]+)$/, handler: (req, res, m) => {
      const lead = leads.find((l) => l.id === m[1]);
      if (!lead) return json(res, 404, { message: 'Lead not found' });
      return json(res, 200, { data: lead });
    } },

  { method: 'PATCH', pattern: /^\/api\/leads\/([^\/?]+)\/status$/, handler: async (req, res, m) => {
      const { status } = await readBody(req);
      if (!PIPELINE_STAGES.includes(status)) {
        return json(res, 422, { message: 'Validation failed', errors: { status: [`status must be one of: ${PIPELINE_STAGES.join(', ')}`] } });
      }
      const lead = leads.find((l) => l.id === m[1]);
      if (!lead) return json(res, 404, { message: 'Lead not found' });
      lead.status = status;
      lead.last_contacted_at = now();
      if (status === 'enrolled' && !lead.enrolled_at) lead.enrolled_at = now();
      lead.updated_at = now();
      return json(res, 200, { message: 'Lead status updated', data: lead });
    } },

  // Students
  { method: 'GET', pattern: /^\/api\/students(\?|$)/, handler: (req, res) => {
      return json(res, 200, paginate(students, req));
    } },

  { method: 'GET', pattern: /^\/api\/students\/([^\/?]+)$/, handler: (req, res, m) => {
      const student = students.find((s) => s.id === m[1]);
      if (!student) return json(res, 404, { message: 'Student not found' });
      return json(res, 200, { data: student });
    } },

  // Sections
  { method: 'GET', pattern: /^\/api\/sections(\?|$)/, handler: (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const grade = url.searchParams.get('grade_level');
      const filtered = grade ? sections.filter((s) => s.grade_level === grade) : sections;
      return json(res, 200, paginate(filtered, req));
    } },

  // Health
  { method: 'GET', pattern: /^\/$/, handler: (req, res) => json(res, 200, { message: 'EduFlow Mock API', status: 'running' }) },
  { method: 'GET', pattern: /^\/up$/, handler: (req, res) => json(res, 200, { status: 'ok' }) },
];

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  for (const route of routes) {
    if (route.method !== req.method) continue;
    const m = req.url.match(route.pattern);
    if (m) {
      try {
        await route.handler(req, res, m);
      } catch (err) {
        json(res, 500, { message: 'Server error', error: String(err) });
      }
      return;
    }
  }

  json(res, 404, { message: 'Not found', path: req.url });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`EduFlow Mock API listening on http://localhost:${PORT}`);
  console.log('Routes:');
  console.log('  POST   /api/auth/login         body: { email }');
  console.log('  GET    /api/auth/me            header: Authorization: Bearer mock-<id>');
  console.log('  GET    /api/leads?status=&source_campaign=&page=&per_page=');
  console.log('  GET    /api/leads/:id');
  console.log('  PATCH  /api/leads/:id/status   body: { status }');
  console.log('  GET    /api/students');
  console.log('  GET    /api/students/:id');
  console.log('  GET    /api/sections?grade_level=');
});
