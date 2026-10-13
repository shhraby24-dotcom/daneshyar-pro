import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// تنظیمات عمومی
// ─────────────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// محدودیت‌ها
// ─────────────────────────────────────────────────────────────────────────────
const FREE_LIMIT = 3;
const PREMIUM_LIMIT = 100;
const RATE_LIMIT_MS = 6000;

const PRIMARY_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: ساخت پرامپت دقیق برای هر نوع سوال
// ─────────────────────────────────────────────────────────────────────────────
function buildQuizPrompt(
  text: string,
  count: number,
  types: string[],
  forExam: boolean,
): string {
  const typeDescriptions: Record<string, string> = {
    mc: `نوع "mc" (چندگزینه‌ای):
- سوال واضح و دقیق باشد
- ۴ گزینه: گزینه 1، گزینه 2، گزینه 3، گزینه 4
- فقط یک گزینه صحیح باشد
- گزینه‌ها مشابه ولی قابل تشخیص باشند
- فیلدها: type="mc", question, options (آرایه 4 تایی), correctIndex (0-3), answer (حرف گزینه صحیح مثل "a"), explanation, difficulty, concept`,
    
    fill: `نوع "fill" (جای خالی):
- جمله‌ای با جای خالی باشد
- جواب باید کلمه یا عبارت کوتاه باشد
- فیلدها: type="fill", question (با ___ یا [جای خالی] در متن), answer (جواب صحیح), acceptableAnswers (آرایه جواب‌های قابل قبول), explanation, difficulty, concept`,
    
    tf: `نوع "tf" (درست/غلط):
- جمله‌ای که باید تشخیص داده شود درست است یا غلط
- گزینه‌ها دقیقاً ["صحیح", "غلط"] باشند
- فیلدها: type="tf", question, options=["صحیح","غلط"], correctIndex (0 یا 1), answer ("صحیح" یا "غلط"), explanation, difficulty, concept`,
  };

  const typeInstructions = types.map(t => typeDescriptions[t] || '').filter(Boolean).join('\n\n');

  return `تو یک معلم حرفه‌ای ایرانی هستی که آزمون‌های آموزشی باکیفیت می‌سازی.

## وظیفه:
از متن زیر دقیقاً ${count} سوال آموزشی به زبان فارسی بساز.

## قانون بسیار مهم (نقض نکن):
فقط و فقط از این نوع‌ها سوال بساز:
${types.map(t => `- ${t}`).join('\n')}

اگر کاربر فقط یک نوع انتخاب کرده، تمام ${count} سوال باید از همان نوع باشند.
اگر چند نوع انتخاب شده، از همه آن‌ها به نسبت مساوی استفاده کن.

## مشخصات هر نوع:
${typeInstructions}

## قوانین کلی:
${forExam ? '- سطح سوالات: سخت و کنکوری (مناسب دانش‌آموزان پیشرفته)' : '- سطح سوالات: متعادل (مناسب یادگیری عمومی)'}
- هر سوال باید از بخش متفاوتی از متن باشد (پوشش کامل متن)
- سوالات تکراری نباشند
- متن سوال واضح و بدون ابهام باشد
- گزینه‌ها (در صورت وجود) از نظر طول و ساختار مشابه باشند
- توضیح (explanation) کوتاه و آموزشی باشد

## فرمت خروجی:
فقط یک آرایه JSON معتبر برگردان (هیچ متن اضافه‌ای قبل یا بعد از آرایه نباشد):
[
  {"type":"...","question":"...","options":[...],"correctIndex":0,"answer":"...","explanation":"...","difficulty":2,"concept":"..."},
  ...
]

## متن درسی:
${text}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: اعتبارسنجی سوال بر اساس نوع
// ─────────────────────────────────────────────────────────────────────────────
function validateQuestion(item: Record<string, unknown>, allowedTypes: string[]): { valid: boolean; error?: string } {
  const type = String(item.type ?? '');
  
  if (!allowedTypes.includes(type)) {
    return { valid: false, error: `نوع "${type}" مجاز نیست (مجاز: ${allowedTypes.join(', ')})` };
  }

  const question = String(item.question ?? '').trim();
  if (!question) {
    return { valid: false, error: 'متن سوال خالی است' };
  }

  if (type === 'mc' || type === 'tf') {
    const options = item.options;
    if (!Array.isArray(options) || options.length === 0) {
      return { valid: false, error: 'گزینه‌ها خالی یا نامعتبر هستند' };
    }
    
    const correctIndex = item.correctIndex;
    if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= options.length) {
      return { valid: false, error: 'correctIndex نامعتبر است' };
    }
  }

  if (type === 'fill') {
    const answer = String(item.answer ?? '').trim();
    if (!answer) {
      return { valid: false, error: 'جواب سوال جای خالی خالی است' };
    }
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: ساخت پرامپت برای سوال جایگزین
// ─────────────────────────────────────────────────────────────────────────────
function buildReplacementPrompt(
  text: string,
  type: string,
  existingQuestion: string,
  error: string,
): string {
  return `تو یک معلم حرفه‌ای ایرانی هستی.

## وظیفه:
یک سوال ${type} جدید و معتبر بساز.

## نکته مهم:
سوال قبلی اشتباه بود: ${error}
سوال جدید باید کاملاً متفاوت باشد.

## متن درسی:
${text}

## فرمت خروجی:
فقط یک آبجکت JSON برگردان:
{"type":"${type}","question":"...","options":[...],"correctIndex":0,"answer":"...","explanation":"...","difficulty":2,"concept":"..."}

## قانون:
سوال جدید باید از بخش متفاوتی از متن باشد و با سوال قبلی هیچ شباهتی نداشته باشد.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler اصلی
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    return json({ ok: false, error: "کلید AI روی سرور تنظیم نشده است" }, 500);
  }

  let body: {
    task?: string;
    text?: string;
    count?: number;
    types?: string[];
    forExam?: boolean;
    level?: string;
    deviceId?: string;
    front?: string;
    back?: string;
    topics?: string;
  };

  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "JSON نامعتبر است" }, 400);
  }

  const deviceId = String(body.deviceId ?? "").trim();
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(deviceId)) {
    return json({ ok: false, error: "deviceId نامعتبر است" }, 400);
  }
  let quotaKey = deviceId;

  const task = body.task === "summary"
    ? "summary"
    : body.task === "difficulty"
      ? "difficulty"
      : body.task === "insight"
        ? "insight"
        : "quiz";

  const text = String(body.text ?? "").slice(0, 6000);

  if (task === "difficulty") {
    if (!String(body.front ?? "").trim() || !String(body.back ?? "").trim()) {
      return json({ ok: false, error: "front و back الزامی هستند" }, 400);
    }
  } else if (task === "insight") {
    if (!String(body.topics ?? "").trim()) {
      return json({ ok: false, error: "topics الزامی است" }, 400);
    }
  } else if (text.length < 20) {
    return json({ ok: false, error: "متن خیلی کوتاه است" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  let tier: "free" | "premium" = "free";
  const authHeader = req.headers.get("Authorization");

  if (authHeader) {
    const anon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      },
    );
    const { data: { user } } = await anon.auth.getUser();

    if (user) {
      quotaKey = user.id;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sub && new Date(sub.expires_at).getTime() > Date.now()) {
        tier = "premium";
      }
    }
  }

  const limit = tier === "premium" ? PREMIUM_LIMIT : FREE_LIMIT;
  const today = new Date().toISOString().slice(0, 10);

  const deductQuota = async (currentCount: number): Promise<void> => {
    await supabase
      .from("ai_usage")
      .upsert(
        {
          device_id: quotaKey,
          usage_date: today,
          count: currentCount + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "device_id,usage_date" },
      );
  };

  const { data: row, error: qErr } = await supabase
    .from("ai_usage")
    .select("count, updated_at")
    .eq("device_id", quotaKey)
    .eq("usage_date", today)
    .maybeSingle();

  if (qErr) {
    return json({ ok: false, error: "خطا در بررسی سهمیه" }, 500);
  }

  const currentCount = row?.count ?? 0;

  if (currentCount >= limit) {
    return json(
      {
        ok: false,
        error: tier === "free"
          ? "سهمیه رایگان روزانه شما تمام شد. فردا دوباره امتحان کنید یا اشتراک تهیه کنید."
          : "سهمیه روزانه شما تمام شد. فردا دوباره امتحان کنید.",
        error_code: "quota_exceeded",
        remaining: 0,
        tier,
      },
      429,
    );
  }

  const lastRequest = row?.updated_at ? new Date(row.updated_at).getTime() : 0;
  const now = Date.now();

  if (now - lastRequest < RATE_LIMIT_MS) {
    const waitSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000);
    return json(
      {
        ok: false,
        error: `${waitSeconds} ثانیه‌ی دیگر دوباره امتحان کنید`,
        error_code: "rate_limited",
        wait_seconds: waitSeconds,
        remaining: limit - currentCount,
        tier,
      },
      429,
    );
  }

  const count = Math.max(3, Math.min(30, Number(body.count ?? 5)));
  const types = Array.isArray(body.types) && body.types.length > 0 ? body.types : ["mc"];
  const forExam = Boolean(body.forExam);

  // ───────────────────────────────────────────────────────────────────────────
  // تسک Quiz با لایه محافظ
  // ───────────────────────────────────────────────────────────────────────────
  if (task === "quiz") {
    const prompt = buildQuizPrompt(text, count, types, forExam);
    const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096 },
            }),
          },
        );

        if (!res.ok) {
          lastError = new Error(`${model} error: ${res.status}`);
          continue;
        }

        const data = await res.json();
        const output = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        if (!output) {
          lastError = new Error(`${model}: پاسخ خالی`);
          continue;
        }

        // پارس خروجی
        const start = output.indexOf('[');
        const end = output.lastIndexOf(']');
        if (start === -1 || end === -1) {
          lastError = new Error('خروجی JSON نامعتبر');
          continue;
        }

        let parsed: Array<Record<string, unknown>>;
        try {
          parsed = JSON.parse(output.slice(start, end + 1));
        } catch {
          lastError = new Error('خطا در پارس کردن JSON');
          continue;
        }

        if (!Array.isArray(parsed)) {
          lastError = new Error('خروجی آرایه نیست');
          continue;
        }

        // ── لایه محافظ: اعتبارسنجی سوال‌ها ──
        const validQuestions: Array<Record<string, unknown>> = [];
        const invalidQuestions: Array<{ index: number; error: string; question: string }> = [];

        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i];
          const validation = validateQuestion(item, types);

          if (validation.valid) {
            validQuestions.push(item);
          } else {
            invalidQuestions.push({
              index: i,
              error: validation.error ?? 'خطای نامشخص',
              question: String(item.question ?? ''),
            });
          }
        }

        // ── جایگزینی سوال‌های نامعتبر (بدون مصرف سهمیه اضافی) ──
        for (const invalid of invalidQuestions) {
          try {
            const replacementPrompt = buildReplacementPrompt(
              text,
              types[0] || 'mc',
              invalid.question,
              invalid.error,
            );

            const replacementRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: replacementPrompt }] }],
                  generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1024 },
                }),
              },
            );

            if (replacementRes.ok) {
              const replacementData = await replacementRes.json();
              const replacementOutput = replacementData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
              
              if (replacementOutput) {
                const objStart = replacementOutput.indexOf('{');
                const objEnd = replacementOutput.lastIndexOf('}');
                if (objStart !== -1 && objEnd !== -1) {
                  const replacementObj = JSON.parse(replacementOutput.slice(objStart, objEnd + 1));
                  const replacementValidation = validateQuestion(replacementObj, types);
                  
                  if (replacementValidation.valid) {
                    validQuestions.push(replacementObj);
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`خطا در ساخت سوال جایگزین: ${(err as Error).message}`);
            // ادامه می‌دهیم، سوال جایگزین ساخته نشد
          }
        }

        // ── بررسی نهایی ──
        if (validQuestions.length === 0) {
          lastError = new Error('هیچ سوال معتبری ساخته نشد');
          continue;
        }

        await deductQuota(currentCount);

        return json({
          ok: true,
          task: "quiz",
          output: JSON.stringify(validQuestions.slice(0, count)),
          model,
          remaining: limit - currentCount - 1,
          tier,
          partial: validQuestions.length < count,
          replaced: invalidQuestions.length,
        });
      } catch (err) {
        lastError = err as Error;
        console.warn(`${model} شکست، تلاش با مدل بعدی...`);
        continue;
      }
    }

    return json(
      {
        ok: false,
        error: "همه مدل‌های AI شکست خوردند: " + (lastError?.message ?? "خطای ناشناخته"),
      },
      502,
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // تسک‌های دیگر (summary, difficulty, insight)
  // ───────────────────────────────────────────────────────────────────────────
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: Error | null = null;

  let prompt: string;
  if (task === "difficulty") {
    prompt = `تو یک معلم ایرانی هستی. سختیِ‌یادگیری این فلش‌کارت را برای یک دانش‌آموز ایرانی بین 0 (خیلی آسان) و 1 (خیلی سخت) تخمین بزن.
فقط یک عدد اعشاری برگردان، بدون هیچ توضیح.
سوال: ${body.front ?? ""}
پاسخ: ${body.back ?? ""}`;
  } else if (task === "insight") {
    prompt = `تو یک مربی دلسوز ایرانی هستی. دانش‌آموز در این موضوع‌ها بیشتر اشتباه کرده: ${body.topics ?? ""}.
در یک تا دو جمله‌ی کوتاه و انگیزشی به فارسی بگو روی چه چیزی تمرکز کند و چرا. فقط متن؛ بدون JSON.`;
  } else {
    prompt = `تو یک معلم خصوصی حرفه‌ای ایرانی هستی که متن درسی را برای «حفظ سریع و ماندگار» آماده می‌کند.

── گام ۱: تشخیص نوع متن ──
نوع متن را تشخیص بده: [ادبی/شعر] [زبان/لغت] [ریاضی/فرمول] [علوم/تعریفی] [تاریخ/اطلاعات عمومی] [ترکیبی]

── گام ۲: قانون لحن بر اساس نوع ──
• ادبی/شعر و زبان: لحن نیمه‌رسمی و محترمانه بماند؛ فقط جملات توضیحی/ربطی ساده شود. ابیات، آرایه‌ها، لغت‌ها و معانی دقیق دست‌نخورده بمانند.
• ریاضی/علوم: توضیح‌ها ساده شود، ولی تعریف‌ها، قضیه‌ها، فرمول‌ها و نمادها عیناً حفظ شوند.
• تاریخ/عمومی: می‌تواند خودمانی‌تر شود، ولی اسامی، تاریخ‌ها و اعداد دقیقاً حفظ شوند.

── گام ۳: قانون طلایی حفاظت (هرگز تغییر نده؛ عیناً در preserved بیاور) ──
۱) ابیات و عبارات ادبی  ۲) لغت و معنی دقیق  ۳) فرمول و نماد  ۴) تعریف رسمی  ۵) اسامی خاص، تاریخ‌ها و اعداد

── گام ۴: خلاصه‌سازی ──
${body.level === "short" ? "سطح خلاصه: خیلی کوتاه و فشرده (حداکثر ۵ نکته)" : body.level === "long" ? "سطح خلاصه: کامل و با جزئیات کافی" : "سطح خلاصه: متوسط و متعادل"}
${body.forExam ? "حالت کنکوری: روی تعاریف، اعداد، فرمول‌ها و نکات تست‌خیز تمرکز کن." : "حالت عادی: برای یادگیری و حفظ آسان."}
بقیه‌ی متن را ساده، کوتاه و قابل‌حفظ کن؛ با سرفصل و دسته‌بندی.
تشبیه/مثال روزمره فقط برای مفاهیم انتزاعی. برای لیست‌ها و ترتیب‌ها یک قلاب حافظه بساز.

── گام ۵: خودآزمایی ──
۲ تا ۳ سوال کوتاه برای مرور فعال.

قانون سخت: فقط بر اساس متن کاربر جواب بده؛ هیچ چیزی اختراع نکن.
خروجی فقط JSON معتبر با این ساختار (هیچ متن اضافه‌ای قبل یا بعد از JSON ننویس):
{"domain":"...","tone":"...","simple_summary":"...","sections":[{"title":"...","points":["..."]}],"preserved":[{"text":"...","why":"..."}],"analogy":"...","mnemonic":"...","self_test":[{"q":"...","a":"..."}],"keywords":["..."]}

متن:
${text}`;
  }

  for (const model of modelsToTry) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: task === "quiz" || task === "summary"
              ? { responseMimeType: "application/json" }
              : {},
          }),
        },
      );

      if (!res.ok) {
        lastError = new Error(`${model} error: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const output = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      if (!output) {
        lastError = new Error(`${model}: پاسخ خالی`);
        continue;
      }

      await deductQuota(currentCount);

      return json({
        ok: true,
        task,
        output,
        model,
        remaining: limit - currentCount - 1,
        tier,
      });
    } catch (err) {
      lastError = err as Error;
      console.warn(`${model} شکست، تلاش با مدل بعدی...`);
      continue;
    }
  }

  return json(
    {
      ok: false,
      error: "همه مدل‌های AI شکست خوردند: " + (lastError?.message ?? "خطای ناشناخته"),
    },
    502,
  );
});