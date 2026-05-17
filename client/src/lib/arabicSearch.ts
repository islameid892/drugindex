/**
 * خريطة شاملة من الأسماء العربية الشهيرة للأدوية إلى نظيراتها بالإنجليزية
 */
const arabicDrugNames: { [key: string]: string[] } = {
  'ريباثا': ['repatha', 'evolocumab'],
  'باناضول': ['panadol', 'paracetamol', 'acetaminophen'],
  'بنادول': ['panadol', 'paracetamol', 'acetaminophen'],
  'أسبرين': ['aspirin'],
  'إيبوبروفين': ['ibuprofen'],
  'ميتفورمين': ['metformin'],
  'ليسينوبريل': ['lisinopril'],
  'أتورفاستاتين': ['atorvastatin'],
  'أوميبرازول': ['omeprazole'],
  'أموكسيسيلين': ['amoxicillin'],
  'سيبروفلوكساسين': ['ciprofloxacin'],
  'الإنسولين': ['insulin'],
  'الأسبرين': ['aspirin'],
  'الديكلوفيناك': ['diclofenac'],
  'الكلوروكين': ['chloroquine'],
  'الدوكسيسيكلين': ['doxycycline'],
  'الفلوكسيتين': ['fluoxetine'],
  'الميتوبرولول': ['metoprolol'],
  'الأملودبين': ['amlodipine'],
  'الأتينولول': ['atenolol'],
  'الفيراباميل': ['verapamil'],
  'الديلتيازيم': ['diltiazem'],
  'الكابتوبريل': ['captopril'],
  'الإنالابريل': ['enalapril'],
  'الرامبريل': ['ramipril'],
  'الفوروسيميد': ['furosemide'],
  'الهيدروكلوروثيازيد': ['hydrochlorothiazide'],
  'السبيرونولاكتون': ['spironolactone'],
  'الديجوكسين': ['digoxin'],
  'الأمودارون': ['amiodarone'],
  'الوارفارين': ['warfarin'],
  'الهيبارين': ['heparin'],
  'الأسيتامينوفين': ['acetaminophen', 'paracetamol'],
  'الكودايين': ['codeine'],
  'الترامادول': ['tramadol'],
  'الميثادون': ['methadone'],
  'الفينتانيل': ['fentanyl'],
  'الديازيبام': ['diazepam'],
  'اللورازيبام': ['lorazepam'],
  'الألبرازولام': ['alprazolam'],
  'الفينيتوين': ['phenytoin'],
  'الفينوباربيتال': ['phenobarbital'],
  'الفالبروات': ['valproate', 'valproic acid'],
  'الليفيتيراسيتام': ['levetiracetam'],
  'الكاربامازيبين': ['carbamazepine'],
  'الأمفيتامين': ['amphetamine'],
  'الميثيلفينيديت': ['methylphenidate'],
  'الأتوموكسيتين': ['atomoxetine'],
  'الجوانفاسين': ['guanfacine'],
  'الكلونيدين': ['clonidine'],
};

/**
 * البحث المحسّن الذي يدعم العربية والإنجليزية
 */
export function normalizeSearchQuery(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const results = [normalized];
  
  // إذا كان النص يحتوي على أحرف عربية
  if (/[\u0600-\u06FF]/.test(query)) {
    const arabicVariants = arabicDrugNames[normalized];
    if (arabicVariants) {
      // أضف جميع النسخ الإنجليزية
      arabicVariants.forEach(variant => {
        results.push(variant.toLowerCase());
      });
    }
  }
  
  return results;
}

/**
 * التحقق من تطابق النص مع أي من النسخ المعايرة
 */
export function matchesSearchQuery(text: string, query: string): boolean {
  const normalizedVariants = normalizeSearchQuery(query);
  const lowerText = text.toLowerCase();
  
  return normalizedVariants.some(variant => lowerText.includes(variant));
}
