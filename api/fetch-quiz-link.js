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

  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
      return res.status(400).json({ error: 'يرجى إدخال رابط يبدأ بـ http أو https' });
    }

    const trimmedUrl = url.trim();

    // Fetch the URL
    const response = await fetch(trimmedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en-US,en;q=0.9'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return res.status(400).json({ error: `تعذر الاتصال بالرابط (رمز الاستجابة: ${response.status})` });
    }

    const html = await response.text();

    let extractedText = '';

    // Check for Google Form embedded JSON data
    const fbMatch = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.+?\]);/s);
    if (fbMatch && fbMatch[1]) {
      try {
        const rawData = JSON.parse(fbMatch[1]);
        extractedText = JSON.stringify(rawData);
      } catch (e) {
        // Fall back to clean text below
      }
    }

    if (!extractedText) {
      // Clean HTML tags and scripts
      const cleanHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s{2,}/g, '\n')
        .trim();

      extractedText = cleanHtml.slice(0, 25000);
    }

    if (!extractedText || extractedText.length < 20) {
      return res.status(400).json({ error: 'لم يتم العثور على محتوى نصي كافٍ في الرابط، يرجى التأكد من صلاحية الرابط.' });
    }

    return res.status(200).json({ success: true, text: extractedText });
  } catch (err) {
    console.error('Fetch quiz URL error:', err);
    return res.status(500).json({ error: 'حدث خطأ أثناء قراءة الرابط. يرجى التأكد من أن الرابط عام ومتاح للجميع دون تسجيل دخول مقيد.' });
  }
}
