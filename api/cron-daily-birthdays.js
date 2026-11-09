import webpush from 'web-push';

const VAPID_PUBLIC_KEY = 'BAtx_VsX7sQqBLrErkVgQhJXjecTxKV0ohn_ICVeQsAjuskf2dAqTKA3982-WlTVeDiPMQ9ubQaBmfnlgW07660';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'i9f-hoomB134FdYKUoXvVCG8phABT6VnxWHTA7tsmOE';

webpush.setVapidDetails(
  'mailto:eng.nader.reda@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // CORS configuration
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
    const targetUserId = queryParams.targetUserId || bodyParams.targetUserId;

    // 1. Calculate Cairo current date (Africa/Cairo timezone)
    const now = new Date();
    const cairoDateString = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    const [cYear, cMonth, cDay] = cairoDateString.split('-').map(Number);
    const cairoToday = new Date(cYear, cMonth - 1, cDay);

    // 2. Fetch all users from Firestore
    const firestoreBase = 'https://firestore.googleapis.com/v1/projects/st-john-church-service/databases/(default)/documents';
    const usersRes = await fetch(`${firestoreBase}/users?pageSize=300`);
    if (!usersRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch users from Firestore' });
    }
    const usersData = await usersRes.json();
    const userDocs = usersData.documents || [];

    // 3. Extract servants with Web Push and birthday candidates
    const servantSubs = [];
    const candidates = [];

    for (const doc of userDocs) {
      const f = doc.fields || {};
      const uId = doc.name.split('/').pop();
      const fullName = f.fullName?.stringValue || 'عضو بالخدمة';
      const role = f.role?.stringValue || 'student';
      const phone = f.phone?.stringValue || '';
      const email = f.email?.stringValue || '';
      const subStr = f.pushSubscription?.stringValue || null;
      const birthDate = f.birthDate?.stringValue || null;

      const isSuperAdmin = phone === '01275571569' || role === 'admin' || email.includes('nader.kamel');
      const isLeader = role === 'servant_leader' || isSuperAdmin;
      const isServant = role === 'servant' || isLeader;

      let subObj = null;
      if (subStr) {
        try {
          subObj = JSON.parse(subStr);
        } catch (e) {}
      }

      if (isServant && subObj?.endpoint) {
        servantSubs.push(subObj);
      }

      if (birthDate && typeof birthDate === 'string' && birthDate.includes('-')) {
        const parts = birthDate.split('-');
        const bYear = parseInt(parts[0], 10);
        const bMonth = parseInt(parts[1], 10); // 1-12
        const bDay = parseInt(parts[2], 10);   // 1-31

        if (!isNaN(bMonth) && !isNaN(bDay)) {
          let targetYear = cYear;
          let nextBday = new Date(cYear, bMonth - 1, bDay);
          if (bMonth < cMonth || (bMonth === cMonth && bDay < cDay)) {
            targetYear = cYear + 1;
            nextBday = new Date(cYear + 1, bMonth - 1, bDay);
          }

          const diffTime = nextBday.getTime() - cairoToday.getTime();
          const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

          candidates.push({
            id: uId,
            fullName,
            role,
            phone,
            subObj,
            birthDate,
            bYear,
            bMonth,
            bDay,
            targetYear,
            daysRemaining
          });
        }
      }
    }

    // Deduplicate servant push subscriptions
    const uniqueServantSubs = Array.from(new Map(servantSubs.map(s => [s.endpoint, s])).values());

    // 4. Filter matching candidates
    const matching = candidates.filter(u => {
      if (targetUserId) {
        return u.id === targetUserId;
      }
      if (force) {
        return u.daysRemaining === 0 || (u.daysRemaining >= 1 && u.daysRemaining <= 3);
      }
      // Standard daily cron trigger: exactly 3 days in advance OR today
      return u.daysRemaining === 0 || u.daysRemaining === 3;
    });

    if (matching.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No birthdays matching trigger conditions for today.',
        cairoDate: cairoDateString,
        servantsSubscribedCount: uniqueServantSubs.length
      });
    }

    let totalPushesSent = 0;
    const dispatchedDetails = [];

    // 5. Dispatch notifications for each matching birthday
    for (const u of matching) {
      const isToday = u.daysRemaining === 0;
      const windowType = isToday ? 'today' : 'remind3';
      const roleTitle = u.role === 'student' ? 'المخدوم' : 'الخادم';
      const docId = `bday_${windowType}_${u.id}_${u.targetYear}`;

      let title = '';
      let desc = '';

      if (isToday) {
        title = `🎉 عيد ميلاد اليوم: ${u.fullName} 🎂`;
        desc = `اليوم عيد ميلاد ${roleTitle} (${u.fullName})، كل سنة وهو طيب وبخير! لا تنسوا الاتصال به ومشاركته الفرحة ✝️`;
      } else {
        const daysText = u.daysRemaining === 1 ? 'غداً بمشيئة ربنا' : u.daysRemaining === 2 ? 'بعد يومين' : 'بعد ٣ أيام';
        title = `🎂 تذكير مبكر بعيد ميلاد: ${u.fullName}`;
        desc = `عيد ميلاد ${roleTitle} (${u.fullName}) ${daysText} في تاريخ (${u.bDay}/${u.bMonth})، جهزوا التهنئة! 🎉`;
      }

      // 6. Anti-duplicate check & write to Firestore notifications collection
      let shouldSendPush = true;
      try {
        const writePayload = {
          fields: {
            title: { stringValue: title },
            desc: { stringValue: desc },
            time: { stringValue: 'الآن' },
            type: { stringValue: 'birthday_alert' },
            targetRole: { stringValue: 'servants' },
            targetUserId: { stringValue: 'SERVANTS' },
            birthdayUserId: { stringValue: u.id },
            birthdayUserName: { stringValue: u.fullName },
            isBirthday: { booleanValue: true },
            daysRemaining: { integerValue: u.daysRemaining.toString() },
            createdAt: { timestampValue: new Date().toISOString() }
          }
        };

        const postRes = await fetch(`${firestoreBase}/notifications?documentId=${docId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(writePayload)
        });

        if (postRes.status === 409 && !force) {
          // Document already created and pushed for this year, skip sending duplicate push
          shouldSendPush = false;
        }
      } catch (err) {
        console.warn('Could not record birthday notification in Firestore:', err);
      }

      if (shouldSendPush && uniqueServantSubs.length > 0) {
        const pushPayload = JSON.stringify({
          title,
          body: desc,
          url: '/?tab=birthdays_hub',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: `bday-${windowType}-${u.id}-${u.targetYear}`
        });

        const pushPromises = uniqueServantSubs.map(sub =>
          webpush.sendNotification(sub, Buffer.from(pushPayload, 'utf8')).catch(err => {
            console.warn('Birthday push error to endpoint:', err.statusCode);
            return null;
          })
        );

        await Promise.allSettled(pushPromises);
        totalPushesSent += uniqueServantSubs.length;
      }

      // If it's today and the birthday person themselves has push active, send them personal congratulations!
      if (isToday && u.subObj?.endpoint) {
        const personalPayload = JSON.stringify({
          title: `🎉 كل سنة وأنت طيب يا ${u.fullName.split(' ')[0]}! 🎂`,
          body: 'أسرة إعداد الخدام تهنئك بعيد ميلادك، وتتمنى لك عاماً مباركاً ومثمراً في النعمة والقامة والبركة ✝️',
          url: '/',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: `bday-personal-${u.id}-${u.targetYear}`
        });

        webpush.sendNotification(u.subObj, Buffer.from(personalPayload, 'utf8')).catch(() => {});
        totalPushesSent += 1;
      }

      dispatchedDetails.push({
        userId: u.id,
        userName: u.fullName,
        windowType,
        daysRemaining: u.daysRemaining,
        pushDispatched: shouldSendPush
      });
    }

    return res.status(200).json({
      success: true,
      cairoDate: cairoDateString,
      servantsSubscribedCount: uniqueServantSubs.length,
      matchedCount: matching.length,
      totalPushesSent,
      details: dispatchedDetails
    });
  } catch (err) {
    console.error('Birthday reminder cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
