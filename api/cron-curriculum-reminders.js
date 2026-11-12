import webpush from 'web-push';

const VAPID_PUBLIC_KEY = 'BAtx_VsX7sQqBLrErkVgQhJXjecTxKV0ohn_ICVeQsAjuskf2dAqTKA3982-WlTVeDiPMQ9ubQaBmfnlgW07660';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'i9f-hoomB134FdYKUoXvVCG8phABT6VnxWHTA7tsmOE';

webpush.setVapidDetails(
  'mailto:eng.nader.reda@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/st-john-church-service/databases/(default)/documents';

function formatCairoDateStr(dateObj) {
  return dateObj.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

async function createNotificationDoc(docId, targetUserId, title, desc) {
  const writePayload = {
    fields: {
      targetUserId: { stringValue: targetUserId },
      title: { stringValue: title },
      desc: { stringValue: desc },
      time: { stringValue: 'الآن' },
      type: { stringValue: 'weekly_curriculum' },
      createdAt: { timestampValue: new Date().toISOString() }
    }
  };

  const res = await fetch(`${FIRESTORE_BASE}/notifications?documentId=${encodeURIComponent(docId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(writePayload)
  });

  // 409 means this exact reminder was already dispatched
  return res.status !== 409;
}

async function sendWebPushToSubs(subs, title, body, tag) {
  if (!subs || subs.length === 0) return 0;
  const payload = JSON.stringify({
    title,
    body,
    url: '/',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag
  });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(sub, Buffer.from(payload, 'utf8')).catch(() => null)
    )
  );
  return results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const queryParams = req.query || {};
    const bodyParams = req.body || {};
    const force = queryParams.force === 'true' || bodyParams.force === true;
    const forcedType = queryParams.type || bodyParams.type; // 'first' | 'wednesday'

    // 1. Determine Cairo date & day of week (0=Sun .. 3=Wed .. 5=Fri)
    const now = new Date();
    const cairoDateStr = formatCairoDateStr(now);
    const [cY, cM, cD] = cairoDateStr.split('-').map(Number);
    const cairoLocal = new Date(Date.UTC(cY, cM - 1, cD));
    const dayOfWeek = cairoLocal.getUTCDay();

    let reminderType = null;
    let targetFridayDateStr = null;

    if (force && (forcedType === 'first' || forcedType === 'wednesday')) {
      reminderType = forcedType;
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
      targetFridayDateStr = forcedType === 'first'
        ? addDaysToDateStr(cairoDateStr, daysUntilFriday)
        : addDaysToDateStr(cairoDateStr, (5 - dayOfWeek + 7) % 7);
    } else if (dayOfWeek === 5) {
      // Friday morning -> remind speakers for NEXT Friday (+7 days)
      reminderType = 'first';
      targetFridayDateStr = addDaysToDateStr(cairoDateStr, 7);
    } else if (dayOfWeek === 3) {
      // Wednesday morning -> friendly reminder for UPCOMING Friday (+2 days)
      reminderType = 'wednesday';
      targetFridayDateStr = addDaysToDateStr(cairoDateStr, 2);
    } else {
      return res.status(200).json({
        skipped: true,
        cairoDate: cairoDateStr,
        dayOfWeek,
        message: 'Automatic curriculum reminders run only on Wednesdays and Fridays.'
      });
    }

    // 2. Fetch users for speaker lookup & leadership push subscriptions
    const usersRes = await fetch(`${FIRESTORE_BASE}/users?pageSize=300`);
    if (!usersRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch users from Firestore' });
    }
    const usersData = await usersRes.json();
    const userDocs = usersData.documents || [];

    const userById = {};
    const leadershipSubsMap = new Map();

    for (const uDoc of userDocs) {
      const f = uDoc.fields || {};
      const uId = uDoc.name.split('/').pop();
      const fullName = f.fullName?.stringValue || 'خادم';
      const role = f.role?.stringValue || 'student';
      const phone = f.phone?.stringValue || '';
      const email = f.email?.stringValue || '';
      const subStr = f.pushSubscription?.stringValue || null;

      let subObj = null;
      if (subStr) {
        try {
          subObj = JSON.parse(subStr);
        } catch (e) {}
      }

      userById[uId] = { id: uId, fullName, subObj };

      const isSuperAdmin = phone === '01275571569' || role === 'admin' || email.includes('nader.kamel');
      const isLeader = role === 'servant_leader' || isSuperAdmin;
      if (isLeader && subObj?.endpoint) {
        leadershipSubsMap.set(subObj.endpoint, subObj);
      }
    }

    const leadershipSubs = Array.from(leadershipSubsMap.values());

    // 3. Fetch curriculum documents
    const currRes = await fetch(`${FIRESTORE_BASE}/service_curriculum?pageSize=50`);
    if (!currRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch service_curriculum from Firestore' });
    }
    const currData = await currRes.json();
    const currDocs = currData.documents || [];

    const dispatched = [];
    const isWednesday = reminderType === 'wednesday';
    const flagFieldName = isWednesday ? 'wednesdayReminderSent' : 'reminderSent';

    for (const cDoc of currDocs) {
      const fields = cDoc.fields || {};
      if (!fields.isWeeklyCurriculum?.booleanValue) continue;

      const docId = cDoc.name.split('/').pop();
      const fridayVals = fields.fridays?.arrayValue?.values || [];
      let docModified = false;

      for (const fVal of fridayVals) {
        const fMap = fVal.mapValue?.fields;
        if (!fMap) continue;

        const fDate = fMap.date?.stringValue || '';
        if (fDate !== targetFridayDateStr) continue;

        const fridayId = fMap.id?.stringValue || fDate;
        const displayDate = fMap.displayDate?.stringValue || fDate;
        const isMerged = Boolean(fMap.isMerged?.booleanValue);

        const sessionEntries = isMerged
          ? [{ key: 'merged', map: fMap.mergedSession?.mapValue?.fields }]
          : [
              { key: 'session1', map: fMap.session1?.mapValue?.fields },
              { key: 'session2', map: fMap.session2?.mapValue?.fields }
            ];

        for (const entry of sessionEntries) {
          const sMap = entry.map;
          if (!sMap) continue;

          const speakerType = sMap.speakerType?.stringValue || 'internal';
          const speakerId = sMap.speakerId?.stringValue || '';
          const alreadySent = Boolean(sMap[flagFieldName]?.booleanValue);

          if (speakerType !== 'internal' || !speakerId || alreadySent) {
            continue;
          }

          const speakerUser = userById[speakerId];
          const servantName = speakerUser?.fullName || sMap.speakerName?.stringValue || 'الخادم';
          const subject = sMap.subject?.stringValue || 'فقرة';
          const titleText = sMap.title?.stringValue || '';
          const topic = titleText ? `${subject} (${titleText})` : subject;

          const notifTitle = isWednesday
            ? '🕊️ تذكير محبة قبل لقاء الجمعة'
            : '📖 بركة تحضير كلمة الخدمة القادمة';

          const notifDesc = isWednesday
            ? `صباح الخير وسلام ونعمة، تذكير ودي وبسيط بأن لقاء الجمعة (${displayDate}) على الأبواب، ويسعدنا مراجعة أو مشاركة تحضير موضوع: (${topic}) مع أمين الخدمة قبل اللقاء. نصلي أن يستخدمك الرب بقوة في هذه الكلمة.`
            : `سلام ونعمة يا خادمنا المبارك، نذكرك بكل محبة بأن عليك بركة تحضير موضوع: (${topic}) ليوم الجمعة القادمة (${displayDate}). ربنا يبارك تعبك ووقتك ليكون سبباً في بركة ونمو جميع إخوتك.`;

          const leaderTitle = isWednesday
            ? '🕊️ متابعة المنهج: تذكير الأربعاء الودي'
            : '📋 متابعة المنهج: تذكير التحضير الأول';

          const leaderDesc = isWednesday
            ? `تم إرسال تذكير الأربعاء الودي للخادم (${servantName}) لمراجعة وتحضيرات كلمة الجمعة (${displayDate}) في موضوع: (${topic}).`
            : `تم إرسال رسالة التذكير الأولى للخادم (${servantName}) لتحضير فقرة: (${topic}) ليوم الجمعة (${displayDate}).`;

          const spkDocId = `curr_spk_${reminderType}_${fridayId}_${entry.key}`;
          const ldrDocId = `curr_ldr_${reminderType}_${fridayId}_${entry.key}`;

          const shouldSendSpeakerPush = await createNotificationDoc(spkDocId, speakerId, notifTitle, notifDesc);
          if (shouldSendSpeakerPush && speakerUser?.subObj?.endpoint) {
            await sendWebPushToSubs([speakerUser.subObj], notifTitle, notifDesc, spkDocId);
          }

          const shouldSendLeaderPush = await createNotificationDoc(ldrDocId, 'LEADERSHIP', leaderTitle, leaderDesc);
          if (shouldSendLeaderPush && leadershipSubs.length > 0) {
            await sendWebPushToSubs(leadershipSubs, leaderTitle, leaderDesc, ldrDocId);
          }

          sMap[flagFieldName] = { booleanValue: true };
          docModified = true;

          dispatched.push({
            fridayId,
            sessionKey: entry.key,
            speakerId,
            servantName,
            reminderType,
            speakerNotified: shouldSendSpeakerPush,
            leadershipNotified: shouldSendLeaderPush
          });
        }
      }

      if (docModified) {
        await fetch(`${FIRESTORE_BASE}/service_curriculum/${docId}?updateMask.fieldPaths=fridays`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              fridays: fields.fridays
            }
          })
        }).catch(err => console.warn('Failed to patch curriculum reminder flag:', err));
      }
    }

    return res.status(200).json({
      success: true,
      cairoDate: cairoDateStr,
      reminderType,
      targetFridayDate: targetFridayDateStr,
      dispatchedCount: dispatched.length,
      dispatched
    });
  } catch (err) {
    console.error('Curriculum reminder cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
