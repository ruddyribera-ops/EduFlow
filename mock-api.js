// EduFlow mock API (Node, zero deps) — stand-in for Laravel backend during local dev.
// Covers: auth stub, leads (Kanban), students, guardians, sections, risk alerts, broadcasts, dashboard stats.

const http = require('http');
const { randomUUID } = require('crypto');

const PIPELINE_STAGES = ['inquiry', 'tour_scheduled', 'application_sent', 'enrolled', 'lost'];
const COMM_PREFS = ['email_only', 'sms_only', 'both'];
const RISK_FACTORS = ['low_attendance', 'grade_decline'];
const ENROLLMENT_STATUSES = ['inquiry', 'applied', 'accepted', 'enrolled', 'withdrawn', 'graduated'];

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
  mkLead('Ethan', 'Rodriguez', 'inquiry', 'Instagram Ads', null),
  mkLead('Sophia', 'Kim', 'tour_scheduled', 'Open House Event', daysAgo(1)),
];

const guardians = [
  { id: 'g-1', first_name: 'Maria', last_name: 'Martinez', email: 'maria.m@email.com', phone: '+1-555-0101', communication_preference: 'both' },
  { id: 'g-2', first_name: 'David', last_name: 'Lee', email: 'david.l@email.com', phone: '+1-555-0102', communication_preference: 'email_only' },
  { id: 'g-3', first_name: 'Susan', last_name: 'Garcia', email: 'susan.g@email.com', phone: null, communication_preference: 'sms_only' },
  { id: 'g-4', first_name: 'Robert', last_name: 'Anderson', email: 'robert.a@email.com', phone: '+1-555-0104', communication_preference: 'email_only' },
  { id: 'g-5', first_name: 'Patricia', last_name: 'Kim', email: 'patricia.k@email.com', phone: '+1-555-0105', communication_preference: 'both' },
];

const students = [
  { id: 's-1', first_name: 'Liam', last_name: 'Martinez', date_of_birth: '2015-04-11', grade_level: '3rd', enrollment_status: 'enrolled', section_id: 'sec-1', guardians: [{ ...guardians[0], relationship_type: 'Mother' }] },
  { id: 's-2', first_name: 'Olivia', last_name: 'Lee', date_of_birth: '2014-09-23', grade_level: '4th', enrollment_status: 'enrolled', section_id: 'sec-2', guardians: [{ ...guardians[1], relationship_type: 'Father' }] },
  { id: 's-3', first_name: 'Noah', last_name: 'Garcia', date_of_birth: '2016-01-07', grade_level: '2nd', enrollment_status: 'applied', section_id: null, guardians: [{ ...guardians[2], relationship_type: 'Guardian' }] },
  { id: 's-4', first_name: 'Emma', last_name: 'Anderson', date_of_birth: '2015-07-19', grade_level: '3rd', enrollment_status: 'enrolled', section_id: 'sec-1', guardians: [{ ...guardians[3], relationship_type: 'Father' }] },
  { id: 's-5', first_name: 'Mason', last_name: 'Kim', date_of_birth: '2014-12-02', grade_level: '4th', enrollment_status: 'enrolled', section_id: 'sec-2', guardians: [{ ...guardians[4], relationship_type: 'Mother' }] },
];

const sections = [
  { id: 'sec-1', name: '3rd Grade - A', grade_level: '3rd', room: '101', semester: 'fall', teacher_id: 'u-tom', counselor_id: 'u-sarah', students_count: 2 },
  { id: 'sec-2', name: '4th Grade - B', grade_level: '4th', room: '202', semester: 'fall', teacher_id: 'u-lisa', counselor_id: 'u-emily', students_count: 2 },
  { id: 'sec-3', name: '2nd Grade - A', grade_level: '2nd', room: '103', semester: 'fall', teacher_id: null, counselor_id: 'u-sarah', students_count: 0 },
];

const riskAlerts = [
  { id: 'r-1', student_id: 's-1', risk_factors: ['low_attendance'], attendance_rate: 0.78, grade_drop_percentage: 0, status: 'pending', created_at: daysAgo(2), reviewed_at: null, notes: null },
  { id: 'r-2', student_id: 's-2', risk_factors: ['grade_decline'], attendance_rate: 0.92, grade_drop_percentage: 0.18, status: 'pending', created_at: daysAgo(1), reviewed_at: null, notes: null },
  { id: 'r-3', student_id: 's-4', risk_factors: ['low_attendance', 'grade_decline'], attendance_rate: 0.72, grade_drop_percentage: 0.22, status: 'reviewed', created_at: daysAgo(5), reviewed_at: daysAgo(1), notes: 'Contacted family; scheduling meeting.' },
];

const broadcasts = [];

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

function expandStudent(s) {
  const section = sections.find((sec) => sec.id === s.section_id) || null;
  return { ...s, section };
}

function expandRiskAlert(r) {
  const student = students.find((s) => s.id === r.student_id);
  return { ...r, student: student ? { id: student.id, first_name: student.first_name, last_name: student.last_name, grade_level: student.grade_level } : null };
}

// ---------- Routes ----------
const routes = [
  // Auth
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

  { method: 'POST', pattern: /^\/api\/auth\/logout$/, handler: (req, res) => json(res, 200, { message: 'Logged out' }) },

  // Dashboard stats
  { method: 'GET', pattern: /^\/api\/stats(\?|$)/, handler: (req, res) => {
      const byStage = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, leads.filter((l) => l.status === s).length]));
      return json(res, 200, {
        data: {
          leads_total: leads.length,
          leads_by_stage: byStage,
          leads_active: leads.filter((l) => !['enrolled', 'lost'].includes(l.status)).length,
          students_total: students.length,
          students_enrolled: students.filter((s) => s.enrollment_status === 'enrolled').length,
          sections_total: sections.length,
          risk_alerts_pending: riskAlerts.filter((r) => r.status === 'pending').length,
          risk_alerts_total: riskAlerts.length,
          broadcasts_sent: broadcasts.length,
        },
      });
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
      const url = new URL(req.url, 'http://localhost');
      const grade = url.searchParams.get('grade_level');
      const status = url.searchParams.get('enrollment_status');
      let filtered = students.map(expandStudent);
      if (grade) filtered = filtered.filter((s) => s.grade_level === grade);
      if (status) filtered = filtered.filter((s) => s.enrollment_status === status);
      return json(res, 200, paginate(filtered, req));
    } },

  { method: 'GET', pattern: /^\/api\/students\/([^\/?]+)$/, handler: (req, res, m) => {
      const student = students.find((s) => s.id === m[1]);
      if (!student) return json(res, 404, { message: 'Student not found' });
      return json(res, 200, { data: expandStudent(student) });
    } },

  // Sections
  { method: 'GET', pattern: /^\/api\/sections(\?|$)/, handler: (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const grade = url.searchParams.get('grade_level');
      const filtered = grade ? sections.filter((s) => s.grade_level === grade) : sections;
      const withTeacher = filtered.map((sec) => ({
        ...sec,
        teacher: users.find((u) => u.id === sec.teacher_id) || null,
        counselor: users.find((u) => u.id === sec.counselor_id) || null,
      }));
      return json(res, 200, paginate(withTeacher, req));
    } },

  // Risk Alerts
  { method: 'GET', pattern: /^\/api\/risk-alerts(\?|$)/, handler: (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const status = url.searchParams.get('status');
      let filtered = riskAlerts;
      if (status) filtered = filtered.filter((r) => r.status === status);
      filtered = [...filtered].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return json(res, 200, paginate(filtered.map(expandRiskAlert), req));
    } },

  { method: 'PATCH', pattern: /^\/api\/risk-alerts\/([^\/?]+)$/, handler: async (req, res, m) => {
      const body = await readBody(req);
      const alert = riskAlerts.find((r) => r.id === m[1]);
      if (!alert) return json(res, 404, { message: 'Alert not found' });
      if (body.status && !['pending', 'reviewed', 'resolved'].includes(body.status)) {
        return json(res, 422, { message: 'Invalid status' });
      }
      if (body.status) {
        alert.status = body.status;
        if (body.status !== 'pending' && !alert.reviewed_at) alert.reviewed_at = now();
      }
      if (body.notes !== undefined) alert.notes = body.notes;
      return json(res, 200, { data: expandRiskAlert(alert) });
    } },

  // Broadcasts
  { method: 'GET', pattern: /^\/api\/broadcasts(\?|$)/, handler: (req, res) => {
      return json(res, 200, paginate([...broadcasts].reverse(), req));
    } },

  { method: 'POST', pattern: /^\/api\/broadcasts$/, handler: async (req, res) => {
      const { message, scope, student_ids } = await readBody(req);
      if (!message || typeof message !== 'string' || message.length < 3) {
        return json(res, 422, { message: 'Validation failed', errors: { message: ['message is required (min 3 chars)'] } });
      }
      if (!['all', 'students'].includes(scope)) {
        return json(res, 422, { message: 'Validation failed', errors: { scope: ['scope must be "all" or "students"'] } });
      }

      let targetGuardians = [];
      if (scope === 'all') {
        targetGuardians = guardians;
      } else {
        if (!Array.isArray(student_ids) || student_ids.length === 0) {
          return json(res, 422, { message: 'Validation failed', errors: { student_ids: ['student_ids required when scope=students'] } });
        }
        const ids = new Set(student_ids);
        const seen = new Set();
        for (const s of students) {
          if (!ids.has(s.id)) continue;
          for (const g of s.guardians) {
            if (!seen.has(g.id)) {
              seen.add(g.id);
              targetGuardians.push(g);
            }
          }
        }
      }

      let email_sent = 0, sms_sent = 0, skipped = 0;
      for (const g of targetGuardians) {
        const pref = g.communication_preference;
        const canEmail = g.email && (pref === 'email_only' || pref === 'both');
        const canSms = g.phone && (pref === 'sms_only' || pref === 'both');
        if (!canEmail && !canSms) { skipped++; continue; }
        if (canEmail) email_sent++;
        if (canSms) sms_sent++;
      }

      const result = {
        id: randomUUID(),
        message,
        scope,
        student_ids: scope === 'students' ? student_ids : null,
        total: targetGuardians.length,
        email_sent,
        sms_sent,
        skipped,
        sent_at: now(),
      };
      broadcasts.push(result);
      return json(res, 201, { data: result });
    } },

  // Health
  { method: 'GET', pattern: /^\/$/, handler: (req, res) => json(res, 200, { message: 'EduFlow Mock API', status: 'running' }) },
  { method: 'GET', pattern: /^\/up$/, handler: (req, res) => json(res, 200, { status: 'ok' }) },
];

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
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
  console.log('  POST   /api/auth/login           body: { email }');
  console.log('  GET    /api/auth/me              Authorization: Bearer mock-<id>');
  console.log('  POST   /api/auth/logout');
  console.log('  GET    /api/stats');
  console.log('  GET    /api/leads?status=&source_campaign=&page=&per_page=');
  console.log('  GET    /api/leads/:id');
  console.log('  PATCH  /api/leads/:id/status     body: { status }');
  console.log('  GET    /api/students?grade_level=&enrollment_status=');
  console.log('  GET    /api/students/:id');
  console.log('  GET    /api/sections?grade_level=');
  console.log('  GET    /api/risk-alerts?status=');
  console.log('  PATCH  /api/risk-alerts/:id      body: { status?, notes? }');
  console.log('  GET    /api/broadcasts');
  console.log('  POST   /api/broadcasts           body: { message, scope: "all"|"students", student_ids? }');
});
