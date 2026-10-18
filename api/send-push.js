import webpush from 'web-push';

const VAPID_PUBLIC_KEY = 'BAtx_VsX7sQqBLrErkVgQhJXjecTxKV0ohn_ICVeQsAjuskf2dAqTKA3982-WlTVeDiPMQ9ubQaBmfnlgW07660';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'i9f-hoomB134FdYKUoXvVCG8phABT6VnxWHTA7tsmOE';

webpush.setVapidDetails(
  'mailto:eng.nader.reda@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscription, targetRole, targetUserId, targetGrade, title, body, url } = req.body || {};

  const payload = JSON.stringify({
    title: title || 'إشعار من خدمة إعداد الخدام ⛪',
    body: body || '',
    url: url || '/'
  });

  const subscriptionsToSend = [];

  // 1. Direct subscription passed from client
  if (subscription) {
    try {
      const parsed = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
      if (parsed?.endpoint) subscriptionsToSend.push(parsed);
    } catch (e) {}
  }

  // 2. Fetch target user subscriptions from Firestore
  try {
    const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/st-john-church-service/databases/(default)/documents/users?pageSize=300';
    const fsRes = await fetch(firestoreUrl);
    if (fsRes.ok) {
      const fsData = await fsRes.json();
      const docs = fsData.documents || [];

      for (const doc of docs) {
        const fields = doc.fields || {};
        const subStr = fields.pushSubscription?.stringValue;
        if (!subStr) continue;

        let userSub = null;
        try {
          userSub = JSON.parse(subStr);
        } catch (e) {
          continue;
        }
        if (!userSub?.endpoint) continue;

        const docId = doc.name.split('/').pop();
        const role = fields.role?.stringValue;
        const phone = fields.phone?.stringValue;
        const grade = fields.grade?.stringValue;
        const email = fields.email?.stringValue || '';

        const isSuperAdmin = phone === '01275571569' || role === 'admin' || email.includes('nader.kamel');
        const isLeader = role === 'servant_leader' || isSuperAdmin;
        const isServant = role === 'servant' || isLeader;

        let shouldSend = false;

        if (targetUserId) {
          if (targetUserId === docId || (targetUserId === 'SUPER_ADMIN' && isSuperAdmin)) {
            shouldSend = true;
          }
        }
        
        if (targetRole) {
          if (targetRole === 'super_admin' && isSuperAdmin) shouldSend = true;
          if (targetRole === 'leadership' && isLeader) shouldSend = true;
          if (targetRole === 'servants' && isServant) shouldSend = true;
          if (targetRole === 'students' && role === 'student') {
            if (!targetGrade || targetGrade === 'ALL' || targetGrade === grade) {
              shouldSend = true;
            }
          }
        }

        if (shouldSend) {
          subscriptionsToSend.push(userSub);
        }
      }
    }
  } catch (fsErr) {
    console.warn('Firestore fetch error in push handler:', fsErr);
  }

  // Deduplicate subscriptions by endpoint
  const uniqueSubs = Array.from(new Map(subscriptionsToSend.map(s => [s.endpoint, s])).values());

  const results = await Promise.allSettled(
    uniqueSubs.map(sub => webpush.sendNotification(sub, Buffer.from(payload, 'utf8')))
  );

  return res.status(200).json({
    success: true,
    sentCount: uniqueSubs.length,
    results: results.map(r => r.status)
  });
}
