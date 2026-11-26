const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/st-john-church-service/databases/(default)/documents';

function decodeFirestoreValue(val) {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const out = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return null;
}

function decodeFirestoreDoc(doc) {
  const out = {};
  const fields = doc?.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = decodeFirestoreValue(v);
  }
  return out;
}

function encodeFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(encodeFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = encodeFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function formatStudentAnswer(ans) {
  if (ans === null || ans === undefined) return '';
  if (Array.isArray(ans)) return ans.map(a => String(a || '').trim()).filter(Boolean).join(' - ');
  if (typeof ans === 'object') {
    return Object.keys(ans)
      .sort()
      .map(k => String(ans[k] || '').trim())
      .filter(Boolean)
      .join(' - ');
  }
  return String(ans).trim();
}

function roundHalf(n) {
  return Math.round(n * 2) / 2;
}

async function callGeminiGrading(apiKey, promptText) {
  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    systemInstruction: {
      parts: [{
        text: `أنت مصحح امتحانات كنسية دقيق وعادل باللغة العربية في كنيسة قبطية أرثوذكسية.
تقوم بمقارنة إجابة المخدوم بنموذج الإجابة المعتمد لكل سؤال وتضع الدرجة العادلة من 0 إلى الدرجة القصوى للسؤال (يُسمح بأنصاف الدرجات مثل 0.5 فقط عند الإجابة الناقصة جزئياً).
في أسئلة أكمل الفراغات: تجاوز الأخطاء الإملائية البسيطة أو الهمزات أو التاء المربوطة أو كتابة الرقم بالحروف ما دام المعنى الكتابي صحيحاً.
في الأسئلة المقالية: قيّم الفكرة والمعنى الروحي الصحيح حتى لو عبّر الطالب بأسلوبه الخاص، ووزّع الدرجات حسب النقاط المطلوبة في النموذج.
يجب أن يكون ردك JSON صالحاً فقط بهذا الشكل:
{
  "evaluations": {
    "question_id": {
      "score": 1,
      "feedback": "سبب التقييم باختصار واضح"
    }
  }
}`
      }]
    },
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };

  let candidates = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastErr = null;

  const tryModels = async (models) => {
    for (const model of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastErr = new Error(errData.error?.message || res.statusText);
          continue;
        }
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;
        try {
          return JSON.parse(rawText);
        } catch {
          const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleaned);
        }
      } catch (e) {
        lastErr = e;
      }
    }
    return null;
  };

  const firstAttempt = await tryModels(candidates);
  if (firstAttempt) return firstAttempt;

  // Fallback model discovery
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      const dynamicModels = (listData.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace('models/', ''))
        .filter(m => !candidates.includes(m));
      const secondAttempt = await tryModels(dynamicModels.slice(0, 5));
      if (secondAttempt) return secondAttempt;
    }
  } catch (e) {
    lastErr = e;
  }

  throw lastErr || new Error('تعذر الاتصال بخدمة التصحيح الذكي');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { submissionId, examId: bodyExamId } = req.body || {};
  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  try {
    // 1. Fetch submission
    const subRes = await fetch(`${FIRESTORE_BASE}/exam_submissions/${submissionId}`);
    if (!subRes.ok) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    const submission = decodeFirestoreDoc(await subRes.json());
    const examId = bodyExamId || submission.examId;
    if (!examId) {
      return res.status(400).json({ error: 'examId missing on submission' });
    }

    // 2. Fetch exam
    const exRes = await fetch(`${FIRESTORE_BASE}/service_exams/${examId}`);
    if (!exRes.ok) {
      return res.status(404).json({ error: 'Exam not found in Firestore' });
    }
    const exam = decodeFirestoreDoc(await exRes.json());
    const questions = Array.isArray(exam.questions) ? exam.questions : [];
    const answers = submission.answers || {};

    // 3. Deterministic grading for MCQ / True-False + collect subjective questions
    const aiEvaluation = {};
    const questionScores = {};
    const subjectiveItems = [];
    let deterministicTotal = 0;

    for (const q of questions) {
      const qId = q.id;
      const maxPts = Number(q.points) || 1;
      const isObj = q.type === 'mcq' || q.type === 'multiple_choice' || q.type === 'true_false';

      if (isObj) {
        const isCorrect = String(answers[qId] || '').trim() === String(q.correctAnswer || '').trim();
        const pts = isCorrect ? maxPts : 0;
        deterministicTotal += pts;
        questionScores[qId] = pts;
        aiEvaluation[qId] = {
          score: pts,
          maxPoints: maxPts,
          isCorrect,
          feedback: isCorrect ? 'إجابة صحيحة' : `الإجابة الصحيحة: ${q.correctAnswer || ''}`
        };
      } else {
        const formatted = formatStudentAnswer(answers[qId]);
        if (!formatted) {
          questionScores[qId] = 0;
          aiEvaluation[qId] = {
            score: 0,
            maxPoints: maxPts,
            isCorrect: false,
            feedback: 'لم يكتب الطالب إجابة لهذا السؤال.'
          };
        } else {
          subjectiveItems.push({
            id: qId,
            type: q.type === 'fill_blank' ? 'أكمل الفراغات' : 'سؤال مقالي',
            questionText: q.questionText,
            correctAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
            maxPoints: maxPts,
            studentAnswer: formatted
          });
        }
      }
    }

    // 4. Read Gemini API Key from Firestore or env
    let apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    try {
      const cfgRes = await fetch(`${FIRESTORE_BASE}/service_settings/ai_config`);
      if (cfgRes.ok) {
        const cfg = decodeFirestoreDoc(await cfgRes.json());
        if (cfg?.geminiApiKey) apiKey = String(cfg.geminiApiKey).trim();
      }
    } catch {}

    if (subjectiveItems.length > 0) {
      if (!apiKey) {
        return res.status(503).json({ error: 'Gemini API key is not configured yet', gradingStatus: 'pending_ai' });
      }

      const prompt = `الامتحان: ${exam.title || 'امتحان'}
قيّم إجابات الطالب التالية بدقة مقارنة بنموذج الإجابة المعتمد والتوزيع الموضح لكل سؤال:

${JSON.stringify(subjectiveItems, null, 2)}`;

      const aiRes = await callGeminiGrading(apiKey, prompt);
      const evals = aiRes?.evaluations || {};

      for (const item of subjectiveItems) {
        const found = evals[item.id] || {};
        const rawScore = Number(found.score);
        const clamped = Number.isFinite(rawScore)
          ? Math.max(0, Math.min(item.maxPoints, roundHalf(rawScore)))
          : 0;
        questionScores[item.id] = clamped;
        aiEvaluation[item.id] = {
          score: clamped,
          maxPoints: item.maxPoints,
          isCorrect: clamped >= item.maxPoints,
          feedback: String(found.feedback || 'تم التقييم بالذكاء الاصطناعي').trim()
        };
      }
    }

    const totalSuggested = roundHalf(
      Object.values(questionScores).reduce((sum, v) => sum + (Number(v) || 0), 0)
    );

    // 5. Patch Firestore exam_submissions/{submissionId}
    const updatePayload = {
      fields: {
        aiEvaluation: encodeFirestoreValue(aiEvaluation),
        questionScores: encodeFirestoreValue(questionScores),
        aiSuggestedScore: encodeFirestoreValue(totalSuggested),
        gradingStatus: encodeFirestoreValue('ai_graded'),
        aiGradedAt: encodeFirestoreValue(new Date().toISOString())
      }
    };

    const maskParams = ['aiEvaluation', 'questionScores', 'aiSuggestedScore', 'gradingStatus', 'aiGradedAt']
      .map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
      .join('&');

    const patchRes = await fetch(`${FIRESTORE_BASE}/exam_submissions/${submissionId}?${maskParams}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      return res.status(500).json({ error: 'Failed to update submission in Firestore', details: errText });
    }

    return res.status(200).json({
      ok: true,
      submissionId,
      aiSuggestedScore: totalSuggested,
      gradingStatus: 'ai_graded',
      aiEvaluation,
      questionScores
    });
  } catch (err) {
    console.error('grade-exam error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
