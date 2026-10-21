import webpush from 'web-push';

const VAPID_PUBLIC_KEY = 'BAtx_VsX7sQqBLrErkVgQhJXjecTxKV0ohn_ICVeQsAjuskf2dAqTKA3982-WlTVeDiPMQ9ubQaBmfnlgW07660';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'i9f-hoomB134FdYKUoXvVCG8phABT6VnxWHTA7tsmOE';

webpush.setVapidDetails(
  'mailto:eng.nader.reda@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const firestoreBase = 'https://firestore.googleapis.com/v1/projects/st-john-church-service/databases/(default)/documents';

    // 1. Fetch active exams
    const examsRes = await fetch(`${firestoreBase}/service_exams?pageSize=100`);
    if (!examsRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch exams from Firestore' });
    }
    const examsData = await examsRes.json();
    const examDocs = examsData.documents || [];

    const activeQuizzes = [];
    for (const doc of examDocs) {
      const f = doc.fields || {};
      const status = f.status?.stringValue || 'draft';
      if (status === 'active') {
        const id = doc.name.split('/').pop();
        const title = f.title?.stringValue || 'مسابقة الأسبوع';
        const grade = f.grade?.stringValue || 'common_hall';
        activeQuizzes.push({ id, title, grade });
      }
    }

    if (activeQuizzes.length === 0) {
      return res.status(200).json({ message: 'No active quizzes found to remind about.' });
    }

    // 2. Fetch all users
    const usersRes = await fetch(`${firestoreBase}/users?pageSize=300`);
    if (!usersRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch users from Firestore' });
    }
    const usersData = await usersRes.json();
    const userDocs = usersData.documents || [];

    // Map users with push subscriptions
    const studentsMap = {};
    for (const uDoc of userDocs) {
      const f = uDoc.fields || {};
      const uId = uDoc.name.split('/').pop();
      const role = f.role?.stringValue;
      const subStr = f.pushSubscription?.stringValue;
      const grade = f.grade?.stringValue || 'first';

      if (role === 'student') {
        studentsMap[uId] = {
          id: uId,
          grade,
          subStr,
          submittedExamIds: new Set()
        };
      }
    }

    // 3. Fetch submissions to see who already submitted
    const subsRes = await fetch(`${firestoreBase}/service_quiz_submissions?pageSize=300`);
    if (subsRes.ok) {
      const subsData = await subsRes.json();
      const subDocs = subsData.documents || [];
      for (const sDoc of subDocs) {
        const f = sDoc.fields || {};
        const examId = f.examId?.stringValue;
        const studentId = f.studentId?.stringValue;
        if (examId && studentId && studentsMap[studentId]) {
          studentsMap[studentId].submittedExamIds.add(examId);
        }
      }
    }

    // 4. For each active quiz, identify unsubmitted students and dispatch notification
    let totalPushed = 0;
    const sentResults = [];

    for (const quiz of activeQuizzes) {
      const unsubmittedSubscriptions = [];

      for (const stId in studentsMap) {
        const st = studentsMap[stId];
        // Target matching
        const matchGrade = (quiz.grade === 'all' || quiz.grade === 'common_hall' || quiz.grade === st.grade);
        if (matchGrade && !st.submittedExamIds.has(quiz.id)) {
          if (st.subStr) {
            try {
              const subObj = JSON.parse(st.subStr);
              if (subObj?.endpoint) {
                unsubmittedSubscriptions.push(subObj);
              }
            } catch (e) {}
          }
        }
      }

      // Deduplicate subscriptions by endpoint
      const uniqueSubs = Array.from(new Map(unsubmittedSubscriptions.map(s => [s.endpoint, s])).values());

      if (uniqueSubs.length > 0) {
        const pushPayload = JSON.stringify({
          title: `⏰ تذكير: آخر موعد لتسليم مسابقة ${quiz.title}`,
          body: `اليوم الخميس هو آخر موعد للتسليم، وسيتم غلق باب التسليم نهائياً الليلة الساعة 12:00 بالليل. برجاء سرعة الحل وتسجيل درجاتك.`,
          url: '/'
        });

        const pushPromises = uniqueSubs.map(sub =>
          webpush.sendNotification(sub, Buffer.from(pushPayload, 'utf8')).catch(err => {
            console.warn('Push error to endpoint:', err.statusCode);
            return null;
          })
        );

        const results = await Promise.allSettled(pushPromises);
        totalPushed += uniqueSubs.length;
        sentResults.push({ quizId: quiz.id, count: uniqueSubs.length });
      }
    }

    return res.status(200).json({
      success: true,
      activeQuizzesCount: activeQuizzes.length,
      totalPushed,
      details: sentResults
    });
  } catch (err) {
    console.error('Thursday reminder cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
