import { Router } from "express";
import { getDb } from "../db";
import { drugEntries, icdCodes, icdBranches, nonCoveredCodes } from "../../drizzle/schema";
import { like, or, eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

const router = Router();

// ── Arabic → English medical term dictionary ──────────────────────────────────
const ARABIC_TO_ENGLISH: Record<string, string[]> = {
  // Diseases
  "سكري": ["diabetes", "diabetic"],
  "السكري": ["diabetes", "diabetic"],
  "ضغط": ["hypertension", "blood pressure"],
  "ضغط الدم": ["hypertension", "blood pressure"],
  "قلب": ["cardiac", "heart", "cardio"],
  "سرطان": ["cancer", "carcinoma", "malignant", "tumor"],
  "ربو": ["asthma"],
  "الربو": ["asthma"],
  "كلى": ["kidney", "renal"],
  "الكلى": ["kidney", "renal"],
  "كبد": ["liver", "hepatic", "hepatitis"],
  "الكبد": ["liver", "hepatic"],
  "صداع": ["headache", "migraine"],
  "حمى": ["fever", "pyrexia"],
  "التهاب": ["inflammation", "inflammatory"],
  "عدوى": ["infection", "infectious"],
  "فيروس": ["virus", "viral"],
  "بكتيريا": ["bacteria", "bacterial"],
  "عظام": ["bone", "osteo"],
  "مفاصل": ["joint", "arthritis"],
  "روماتيزم": ["rheumatoid", "arthritis"],
  "غدة درقية": ["thyroid"],
  "الغدة الدرقية": ["thyroid"],
  "أنيميا": ["anemia", "anaemia"],
  "فقر الدم": ["anemia", "anaemia"],
  "كوليسترول": ["cholesterol", "hyperlipidemia"],
  "تنفس": ["respiratory", "breathing", "pulmonary"],
  "رئة": ["lung", "pulmonary", "respiratory"],
  "الرئة": ["lung", "pulmonary"],
  "معدة": ["gastric", "stomach", "gastro"],
  "المعدة": ["gastric", "stomach"],
  "قولون": ["colon", "colorectal", "intestinal"],
  "جلد": ["skin", "dermal", "dermatitis"],
  "الجلد": ["skin", "dermal"],
  "عيون": ["eye", "ocular", "ophthalmic"],
  "العيون": ["eye", "ocular"],
  "أذن": ["ear", "otitis"],
  "الأذن": ["ear", "otitis"],
  "أنف": ["nasal", "nose", "rhinitis"],
  "حلق": ["throat", "pharyngitis"],
  "صدر": ["chest", "thoracic"],
  "بول": ["urinary", "urine", "renal"],
  "حمل": ["pregnancy", "obstetric", "maternal"],
  "الحمل": ["pregnancy", "obstetric"],
  "نفسي": ["psychiatric", "mental", "psychological"],
  "اكتئاب": ["depression", "depressive"],
  "قلق": ["anxiety"],
  "صرع": ["epilepsy", "seizure"],
  "شلل": ["paralysis", "stroke"],
  "سكتة": ["stroke", "cerebrovascular"],
  "هشاشة": ["osteoporosis"],
  "هشاشة العظام": ["osteoporosis"],
  "بروستاتا": ["prostate"],
  "مناعة": ["immune", "immunodeficiency", "autoimmune"],
  "إيدز": ["HIV", "AIDS", "immunodeficiency"],
  "كورونا": ["COVID", "coronavirus"],
  "إنفلونزا": ["influenza", "flu"],
  "تيفويد": ["typhoid"],
  "ملاريا": ["malaria"],
  "تدرن": ["tuberculosis", "TB"],
  "السل": ["tuberculosis", "TB"],
  // Drugs
  "باراسيتامول": ["paracetamol", "acetaminophen"],
  "ايبوبروفين": ["ibuprofen"],
  "أسبرين": ["aspirin", "acetylsalicylic"],
  "أموكسيسيلين": ["amoxicillin"],
  "ميتفورمين": ["metformin"],
  "أنسولين": ["insulin"],
  "بنادول": ["panadol", "paracetamol"],
  "فولتارين": ["voltaren", "diclofenac"],
  "أوميبرازول": ["omeprazole"],
  "أتورفاستاتين": ["atorvastatin"],
  // ICD codes mentioned directly
  "E11": ["E11", "diabetes"],
  "E10": ["E10", "diabetes"],
  "I10": ["I10", "hypertension"],
  "J45": ["J45", "asthma"],
};

// ── Extract search terms from query ──────────────────────────────────────────
function extractSearchTerms(query: string): string[] {
  const isArabic = /[\u0600-\u06FF]/.test(query);
  const terms = new Set<string>();

  if (isArabic) {
    // For Arabic queries: map to English medical terms
    const words = query
      .replace(/[؟?!،,\.]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    for (const word of words) {
      // Check exact match in dictionary
      if (ARABIC_TO_ENGLISH[word]) {
        ARABIC_TO_ENGLISH[word].forEach((t) => terms.add(t));
      }
      // Check partial match (word is part of a key)
      for (const [key, vals] of Object.entries(ARABIC_TO_ENGLISH)) {
        if (key.includes(word) || word.includes(key)) {
          vals.forEach((t) => terms.add(t));
        }
      }
    }

    // Also check the full query against multi-word keys
    for (const [key, vals] of Object.entries(ARABIC_TO_ENGLISH)) {
      if (query.includes(key)) {
        vals.forEach((t) => terms.add(t));
      }
    }

    // If no mapping found, try to use any ICD code patterns in the query
    const icdPattern = /[A-Z]\d{2}(?:\.\d+)?/g;
    const icdMatches = query.match(icdPattern);
    if (icdMatches) icdMatches.forEach((c) => terms.add(c));

  } else {
    // For English queries: use words directly
    const words = query
      .replace(/[?!,\.]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .filter((w) => !["the", "what", "is", "are", "for", "and", "or", "icd", "code", "codes", "about", "tell", "me", "how", "does", "do", "can", "which"].includes(w.toLowerCase()));

    words.forEach((w) => terms.add(w));

    // Also add the full query for short queries
    if (query.length <= 40) terms.add(query.trim());
    
    // Add uppercase versions (database stores in UPPERCASE)
    words.forEach((w) => terms.add(w.toUpperCase()));
  }

  return [...terms].slice(0, 8);
}

/**
 * POST /api/askSila/chat
 */
router.post("/chat", async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid input: message is required" });
    }

    // 1. Deep database search
    const dbContext = await deepDatabaseSearch(message);

    // 2. Build system message
    const systemMessage = buildSystemMessage(dbContext, message);

    // 3. Prepare messages
    const messages = [
      { role: "system" as const, content: systemMessage },
      ...conversationHistory.slice(-8),
      { role: "user" as const, content: message },
    ];

    // 4. Call LLM
    const response = await invokeLLM({ messages: messages as any });

    const assistantMessage =
      response.choices?.[0]?.message?.content ||
      "عذراً، لم أتمكن من توليد رد. يرجى المحاولة مرة أخرى.";

    res.json({
      message: assistantMessage,
      dbHits: dbContext.totalHits,
      conversationHistory: [
        ...conversationHistory,
        { role: "user", content: message },
        { role: "assistant", content: assistantMessage },
      ],
    });
  } catch (error) {
    console.error("Ask Sila error:", error);
    res.status(500).json({
      error: "Failed to process request",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Deep database search across all tables
 */
async function deepDatabaseSearch(query: string) {
  const db = await getDb();
  const searchTerms = extractSearchTerms(query);

  const results = {
    medications: [] as any[],
    icdCodes: [] as any[],
    icdBranches: [] as any[],
    nonCoveredCodes: [] as any[],
    totalHits: 0,
    searchTermsUsed: searchTerms,
  };

  if (searchTerms.length === 0) return results;

  try {
    // --- Search drug_entries ---
    const drugConditions = searchTerms.flatMap((k) => [
      like(drugEntries.scientificName, `%${k}%`),
      like(drugEntries.tradeName, `%${k}%`),
      like(drugEntries.indication, `%${k}%`),
    ]);

    const drugs = await db
      .select()
      .from(drugEntries)
      .where(or(...drugConditions))
      .limit(8);

    results.medications = (drugs as any[]).map((d: any) => ({
      scientificName: d.scientificName,
      tradeName: d.tradeName,
      indication: d.indication,
      icdCodesRaw: d.icdCodesRaw,
    }));

    // --- Search ICD codes ---
    const icdConditions = searchTerms.flatMap((k) => [
      like(icdCodes.description, `%${k}%`),
      like(icdCodes.code, `%${k}%`),
    ]);

    const codes = await db
      .select()
      .from(icdCodes)
      .where(or(...icdConditions))
      .limit(8);

    results.icdCodes = (codes as any[]).map((c: any) => ({
      code: c.code,
      description: c.description,
      branchCount: c.branchCount,
    }));

    // --- Fetch branches for found ICD codes ---
    if (codes.length > 0) {
      const codeIds = (codes as any[]).slice(0, 3).map((c: any) => c.id);
      for (const codeId of codeIds) {
        const branches = await db
          .select()
          .from(icdBranches)
          .where(eq(icdBranches.parentCodeId, codeId))
          .limit(5);
        results.icdBranches.push(...(branches as any[]).map((b: any) => ({
          branchCode: b.branchCode,
          branchDescription: b.branchDescription,
        })));
      }
    }

    // --- Search non-covered codes ---
    const nonCoveredConditions = searchTerms.flatMap((k) => [
      like(nonCoveredCodes.description, `%${k}%`),
      like(nonCoveredCodes.code, `%${k}%`),
    ]);

    const nonCovered = await db
      .select()
      .from(nonCoveredCodes)
      .where(or(...nonCoveredConditions))
      .limit(5);

    results.nonCoveredCodes = (nonCovered as any[]).map((n: any) => ({
      code: n.code,
      description: n.description,
    }));

    results.totalHits =
      results.medications.length +
      results.icdCodes.length +
      results.nonCoveredCodes.length;

  } catch (err) {
    console.error("DB search error:", err);
  }

  return results;
}

/**
 * Build a rich system prompt with database context
 */
function buildSystemMessage(context: any, userQuery: string): string {
  const isArabic = /[\u0600-\u06FF]/.test(userQuery);

  let dbSection = "";

  if (context.totalHits > 0) {
    const parts: string[] = [];

    if (context.medications.length > 0) {
      parts.push(
        `## Medications Found in Database (${context.medications.length} results):\n` +
        (context.medications as any[]).map((m) =>
          `- **${m.tradeName}** (${m.scientificName})\n  Indication: ${m.indication}\n  ICD Codes: ${m.icdCodesRaw}`
        ).join("\n")
      );
    }

    if (context.icdCodes.length > 0) {
      parts.push(
        `## ICD-10 Codes Found in Database (${context.icdCodes.length} results):\n` +
        (context.icdCodes as any[]).map((c) =>
          `- **${c.code}**: ${c.description}${c.branchCount > 0 ? ` (${c.branchCount} sub-codes)` : ""}`
        ).join("\n")
      );
    }

    if (context.icdBranches.length > 0) {
      parts.push(
        `## Sub-codes / Branches:\n` +
        (context.icdBranches as any[]).map((b) =>
          `  - ${b.branchCode}: ${b.branchDescription}`
        ).join("\n")
      );
    }

    if (context.nonCoveredCodes.length > 0) {
      parts.push(
        `## ⚠️ Non-Covered Codes (Saudi Insurance):\n` +
        (context.nonCoveredCodes as any[]).map((n) =>
          `- **${n.code}**: ${n.description} — NOT covered by Saudi insurance`
        ).join("\n")
      );
    }

    dbSection = `\n\n---\n### 📂 Data Retrieved from drugindex.click Database:\n${parts.join("\n\n")}`;
  } else {
    dbSection = `\n\n---\n### 📂 Database Search Result:\nNo direct match found in the drugindex.click database for this query. Responding from general medical knowledge.`;
  }

  return `You are **Sila** (سيلا), the official AI medical assistant of **drugindex.click** — a comprehensive ICD-10 and medication reference platform for Saudi Arabia.

## Your Identity:
- You are an embedded assistant of drugindex.click, not a standalone AI
- You have direct access to the site's database of 56,000+ medications and 39,000+ ICD-10 codes
- You specialize in: ICD-10 coding, Saudi Billing System (SBS v3.0), medication lookup, and insurance coverage
- You are knowledgeable, professional, and friendly

## Response Language Rules (CRITICAL):
- ALWAYS respond in the SAME language the user wrote in
- If the user writes in Arabic → respond ENTIRELY in Arabic (no English words in the text)
- If the user writes in English → respond ENTIRELY in English (no Arabic words in the text)
- Exception: medical terms can appear as: Arabic term (English term) — only in parentheses
- NEVER mix Arabic and English in the same sentence

## Response Formatting Rules (CRITICAL):
- Structure every response with clear sections using markdown headers (###)
- Use **bold** for drug names, ICD codes, and key terms
- Use numbered lists (1. 2. 3.) for steps or multiple items
- Use bullet points (- ) for features or attributes
- Add a blank line between each section
- Keep paragraphs short (2-3 sentences max)
- For ICD codes always format as: **CODE** - Description
- End with a helpful follow-up suggestion when relevant

## Database Usage:
- When database results are provided below, ALWAYS reference them explicitly
- In Arabic responses say: "وجدت في قاعدة بيانات drugindex.click..."
- In English responses say: "Found in drugindex.click database..."
- For non-covered codes, always warn the user clearly with ⚠️
${dbSection}`;
}

/**
 * GET /api/askSila/health
 */
router.get("/health", (req, res) => {
  res.json({ status: "online", service: "Ask Sila", version: "2.0" });
});

export default router;
