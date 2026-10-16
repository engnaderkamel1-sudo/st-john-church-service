import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { checkIsAppAdmin } from '../utils/security';

// Coptic Orthodox Church Educational Persona & Strict Grounding Guidelines
const CHURCH_SYSTEM_INSTRUCTION = `أنت مساعد تعليمي وتحليلي ذكي ودقيق جداً.
القاعدة الذهبية الصارمة: يجب أن تلتزم التزاماً حرفياً ومطلقاً بالمحتوى المرفق (الملف أو الصورة أو النص المدخل) بنسبة 100%.
- ممنوع منعاً باتاً اختلاق أو تأليف أي معلومات أو مواضيع غير موجودة في المستند المرفق.
- إذا كان المستند المرفق كتاباً أو درساً كنسياً، صيغه بالفكر الأرثوذكسي القويم بدقة.
- إذا كان المستند المرفق موضوعاً عاماً أو إدارياً أو وثيقة خاصة (مثل تعليمات، إعلانات، إلخ)، قم بتلخيصه أو استخراج شرائحه كما هو تماماً دون إقحام أي مصطلحات كنسية أو تأليف من خارج النص.
- يجب إخراج النتيجة بتنسيق JSON نظيف وصحيح 100% بدون أي كود Markdown خارجي أو نصوص استهلالية.`;

// Get API Key from Firestore or env fallback
export async function getGeminiApiKey(requesterRole = 'servant') {
  if (requesterRole === 'student') {
    return '';
  }
  try {
    const docRef = doc(db, 'service_settings', 'ai_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().geminiApiKey) {
      return docSnap.data().geminiApiKey.trim();
    }
  } catch (err) {
    console.warn('Could not read AI config from Firestore, checking env:', err);
  }
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

// Save API Key to Firestore (Admin only)
export async function saveGeminiApiKey(apiKey, user) {
  if (!checkIsAppAdmin(user)) {
    throw new Error('غير مصرح لك بتعديل مفتاح الذكاء الاصطناعي، هذه العملية مخصصة للمشرف العام فقط.');
  }
  const docRef = doc(db, 'service_settings', 'ai_config');
  await setDoc(docRef, { geminiApiKey: apiKey.trim(), updatedAt: new Date().toISOString() }, { merge: true });
}

// In-memory cache for working model to reduce latency
let cachedWorkingModel = null;
let cachedActiveModels = null;

// Helper to call Gemini REST API with automatic model discovery
async function callGemini({ prompt, fileBase64, mimeType, systemInstruction = CHURCH_SYSTEM_INSTRUCTION }) {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error('لم يتم تعيين مفتاح Gemini API في إعدادات المنصة. يرجى من أمين الخدمة أو المشرف إدخال المفتاح في لوحة التحكم.');
  }

  const parts = [];
  if (fileBase64 && mimeType) {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: fileBase64
      }
    });
  }

  parts.push({ text: prompt });

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: parts
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json'
    }
  };

  // Cache for confirmed working model and available models to eliminate redundant roundtrips
  const candidates = [];
  if (cachedWorkingModel) {
    candidates.push(cachedWorkingModel);
  }
  // Fast default candidates
  ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'].forEach(m => {
    if (!candidates.includes(m)) candidates.push(m);
  });

  let lastError = null;

  // Step 1: Try fast candidates first
  for (const model of candidates) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;
        lastError = new Error(`خطأ في النموذج (${model}): ${errorMsg}`);
        continue; // Try next fast candidate
      }

      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        lastError = new Error('لم يتم استلام رد من النموذج');
        continue;
      }

      cachedWorkingModel = model; // Cache confirmed working model

      try {
        return JSON.parse(rawText);
      } catch (err) {
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      }
    } catch (err) {
      lastError = err;
    }
  }

  // Step 2: If fast candidates failed, dynamically discover supported models via API
  let activeModels = cachedActiveModels || [];
  if (activeModels.length === 0) {
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        if (Array.isArray(listData.models)) {
          activeModels = listData.models
            .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
            .map(m => m.name.replace('models/', ''));
          cachedActiveModels = activeModels;
        }
      }
    } catch (discoveryErr) {
      console.warn('Could not list models:', discoveryErr);
    }
  }

  const preferredOrder = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
  const remainingCandidates = [
    ...preferredOrder.filter(m => activeModels.includes(m)),
    ...activeModels.filter(m => !preferredOrder.includes(m))
  ].filter(m => !candidates.includes(m));

  for (const model of remainingCandidates) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;
        lastError = new Error(`خطأ في النموذج (${model}): ${errorMsg}`);
        continue;
      }

      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        lastError = new Error('لم يتم استلام رد من النموذج');
        continue;
      }

      cachedWorkingModel = model;

      try {
        return JSON.parse(rawText);
      } catch (err) {
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('فشل الاتصال بنماذج الذكاء الاصطناعي. يرجى التأكد من صلاحية مفتاح الـ API.');
}

// 1. Generate Church Exam Questions
export async function generateChurchQuestions({ fileBase64, mimeType, textContent = '', grade = 'first', count = 5, questionTypes = ['mcq', 'true_false'], customInstructions = '' }) {
  const gradeLabel = {
    first: 'سنة أولى',
    second: 'سنة ثانية',
    third: 'سنة ثالثة',
    elisha: 'فصل أليشع (إعداد خدام تمهيدي)'
  }[grade] || 'إعداد خدام';

  const typesDesc = questionTypes.map(t => {
    if (t === 'mcq') return 'اختيار من متعدد (mcq) مع 4 اختيارات متوازنة';
    if (t === 'true_false') return 'صح وخطأ (true_false) مع خيارين فقط: صح أو خطأ';
    if (t === 'essay') return 'سؤال مقالي فكري أو روحي (essay) مع إجابة نموذجية مختصرة';
    return t;
  }).join(' و ');

  const prompt = `
بناءً على المحتوى المرفق (ملف، صورة، أو نص: ${textContent}):
قم باستخراج وتوليد عدد (${count}) أسئلة تعليمية وروحية متميزة لمرحلة (${gradeLabel}).
الأنواع المطلوبة: ${typesDesc}.
${customInstructions ? `\nتوجيهات وملاحظات إضافية هامة من الخادم المسؤول يجب الالتزام بها بدقة:\n"${customInstructions}"\n` : ''}

يجب أن يكون الرد بتنسيق JSON حصراً كـ Array من الكائنات بالمفتاح "questions":
{
  "questions": [
    {
      "id": "q_1",
      "questionText": "نص السؤال الواضح والدقيق؟",
      "type": "mcq" أو "true_false" أو "essay",
      "options": ["اختيار 1", "اختيار 2", "اختيار 3", "اختيار 4"], // أو ["صح", "خطأ"] للصح والخطأ، ومصفوفة فارغة للمقالي
      "correctAnswer": "الإجابة الصحيحة المطابقة لأحد الاختيارات",
      "points": 5,
      "explanation": "شرح الإجابة والشاهد الكتابي أو الكنسي المرتبط به",
      "difficulty": "سهل" أو "متوسط" أو "ممتاز"
    }
  ]
}
`;

  const data = await callGemini({ prompt, fileBase64, mimeType });
  return data.questions || data;
}

// 2. Generate Church Interactive Presentation Slides
export async function generateChurchPresentation({ fileBase64, mimeType, textContent = '', grade = 'first', slideCount = 6, customInstructions = '' }) {
  const gradeLabel = {
    first: 'سنة أولى',
    second: 'سنة ثانية',
    third: 'سنة ثالثة',
    elisha: 'فصل أليشع (إعداد خدام تمهيدي)'
  }[grade] || 'إعداد خدام';

  const prompt = `
بناءً على المحتوى المرفق (ملف، صورة، أو نص: ${textContent}):
قم بإعداد وتلخيص هذا الدرس في شكل عرض تقديمي تفاعلي ملخص وممتع (Presentation Slides) لمرحلة (${gradeLabel}).
العدد المطلوب: حوالي (${slideCount}) شرائح متسلسلة لشرح الدرس على شاشة العرض (Data Show).
${customInstructions ? `\nتوجيهات وملاحظات إضافية هامة من الخادم المسؤول (مثل التركيز على نقاط معينة أو حذف نقاط):\n"${customInstructions}"\n` : ''}

أخرج النتيجة كـ JSON كائن بالمفتاح "presentation":
{
  "presentation": {
    "title": "عنوان العرض التقديمي والموضوع الأساسي",
    "theme": "الموضوع (عقيدة / طقس / تاريخ كنسي / كتاب مقدس / روحيات)",
    "slides": [
      {
        "slideNumber": 1,
        "title": "عنوان الشريحة",
        "keyScripture": "الآية المحورية وشاهدها (إن وجدت)",
        "bullets": [
          "نقطة شرح أساسية ومباشرة 1",
          "نقطة شرح أساسية ومباشرة 2",
          "نقطة شرح أساسية ومباشرة 3"
        ],
        "speakerNotes": "توجيه وتأمل للخادم أثناء إلقاء هذه الشريحة أمام المخدومين",
        "groupQuestion": "سؤال تفاعلي سريع للشباب في القاعة"
      }
    ]
  }
}
`;

  const data = await callGemini({ prompt, fileBase64, mimeType });
  return data.presentation || data;
}

// 3. Generate Church Study Guide & Capsule
export async function generateChurchStudyGuide({ fileBase64, mimeType, textContent = '', grade = 'first', customInstructions = '' }) {
  const gradeLabel = {
    first: 'سنة أولى',
    second: 'سنة ثانية',
    third: 'سنة ثالثة',
    elisha: 'فصل أليشع (إعداد خدام تمهيدي)'
  }[grade] || 'إعداد خدام';

  const prompt = `
بناءً حصرياً على المحتوى والمستند المرفق (ملف، صورة، أو نص: ${textContent}):
قم بعمل ملخص دراسي شامل ومنظم لمرحلة (${gradeLabel}) مستخرجاً بدقة وأمانة تامة من واقع المستند فقط دون إضافة أي معلومات خارجية.
${customInstructions ? `\nتوجيهات وملاحظات إضافية هامة من الخادم المسؤول:\n"${customInstructions}"\n` : ''}
أخرج النتيجة كـ JSON كائن بالمفتاح "studyGuide":
{
  "studyGuide": {
    "title": "عنوان الملخص المستخرج من المستند",
    "summary": "ملخص عام وشامل لمحتوى المستند الفعلي",
    "mainPoints": ["نقطة رئيسية مستخرجة من المستند 1", "نقطة رئيسية مستخرجة من المستند 2"],
    "keyFiguresAndDates": ["شخصية أو تاريخ أو معلومة بارزة من المستند"],
    "spiritualApplications": ["استنتاج أو تطبيق عملي مرتبط بما ورد في المستند"],
    "groupDiscussion": ["سؤال نقاش أو استفسار مستوحى من محتوى المستند"]
  }
}
`;

  const data = await callGemini({ prompt, fileBase64, mimeType });
  return data.studyGuide || data;
}

// 4. Transcribe Handwritten/Printed Quizzes from Image (OCR to Form Questions)
export async function transcribeHandwrittenQuizFromImage({ fileBase64, mimeType, customInstructions = '' }) {
  const prompt = `
أنت خبير فك وقراءة خط اليد والنصوص في مستندات ومسابقات الخدمة الكنسية ومدارس الأحد وإعداد الخدام.
المهمة الأساسية الصارمة:
قم بقراءة وتحويل ورقة الأسئلة المكتوبة بخط اليد أو المطبوعة في الصورة إلى قائمة أسئلة مسابقة رقمية جاهزة كـ Google Form بدقة تامة 100%.

القواعد الإرشادية لفك خط اليد والأسئلة:
1. اقرأ كل سؤال مكتوب بدقة أمانة متناهية (نص السؤال الواضح) بالترتيب كما هو في الورقة.
2. إذا كان رأس الأسئلة "ضع علامة ✓ أو ✗" أو توجد علامات (✓) أو (✗) بجانب الأسئلة، فنوع السؤال هو "true_false" وخياراته ["صح", "خطأ"].
3. إذا كانت هناك إجابة مدونة في الورقة بين قوسين بجوار السؤال (مثل ✓ أو ✗ أو كنعان وسلسله فقط)، استخرج الإجابة النموذجية واجعل correctAnswer إما "صح" أو "خطأ". وإذا كان هناك تعليق أو تصحيح مكتوب بجوار السؤال ضعه في حقل "explanation".
4. إذا كانت الأسئلة اختيار من متعدد، استخرج خيارات الإجابة وحدد الإجابة الصحيحة.
5. حدد درجة افتراضية متوازنة لكل سؤال (مثلاً 1 أو 2 نقطة).
6. استخرج عنواناً ذكياً مقترحاً للمسابقة من موضوع الأسئلة أو ما هو مكتوب في أعلى الورقة (مثلاً: "مسابقة سفر التكوين: فلك نوح وأب الآباء إبراهيم").

يجب أن يكون الرد بتنسيق JSON حصراً كـ Object يحتوي على:
{
  "quizTitle": "عنوان المسابقة المقترح",
  "subject": "كتاب مقدس",
  "questions": [
    {
      "id": "q_1",
      "questionText": "حادثة الطوفان واللغات ترمز إلى المعمودية",
      "type": "true_false",
      "options": ["صح", "خطأ"],
      "correctAnswer": "صح",
      "points": 2,
      "explanation": "مكتوب بالورقة: رمز للمعمودية"
    }
  ]
}
`;

  const data = await callGemini({ prompt, fileBase64, mimeType });
  return data;
}
