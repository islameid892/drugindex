# شرح تعديل Database - دليل عملي بالعربية

## الطريقة 1️⃣: Admin Panel (الأسهل للمبتدئين)

### الخطوة 1: الدخول إلى Admin Panel

```
1. افتح الموقع
2. اذهب إلى: https://your-domain.com/admin
3. سجل دخولك بحسابك
4. ستشوف لوحة التحكم
```

### الخطوة 2: البحث عن دواء

```
1. اضغط على تبويب "Medications"
2. في شريط البحث، اكتب اسم الدواء:
   - مثلاً: "Panadol" أو "باراسيتامول"
3. الموقع سيعرض لك النتائج
```

### الخطوة 3: تعديل الدواء

```
1. اضغط على الدواء من النتائج
2. ستشوف نموذج التعديل:
   
   ┌─────────────────────────────┐
   │ Trade Names: Panadol        │
   │ Scientific: Acetaminophen   │
   │ Indication: Pain, Fever     │
   │ ICD-10 Codes: R50.9, M79.3  │
   │ Coverage: Covered           │
   └─────────────────────────────┘

3. غيّر ما تريد
4. اضغط "Save" (حفظ)
```

### الخطوة 4: إضافة دواء جديد

```
1. اضغط زر "Add Medication" (إضافة دواء)
2. ملأ الحقول:
   
   Trade Names: أسماء الدواء التجارية
   مثال: Panadol, Paracetamol
   
   Scientific Name: الاسم العلمي
   مثال: Acetaminophen
   
   Indication: الاستخدام الطبي
   مثال: Pain, Fever (ألم، حمى)
   
   ICD-10 Codes: أكواد التصنيف
   مثال: R50.9, M79.3
   
   Coverage Status: حالة التغطية
   اختر: Covered (مغطى) أو Not Covered (غير مغطى)

3. اضغط "Save"
```

### الخطوة 5: حذف دواء

```
1. ابحث عن الدواء
2. اضغط عليه
3. اضغط زر "Delete" (حذف)
4. أكد الحذف
```

---

## الطريقة 2️⃣: SQL Queries (الأسرع للتعديلات الكثيرة)

### الخطوة 1: فتح Database Query Editor

```
1. اذهب إلى Management UI (لوحة التحكم)
2. اضغط على "Database"
3. اضغط على "Query Editor"
4. ستشوف نافذة لكتابة الأوامر
```

### الخطوة 2: أمثلة عملية

#### مثال 1️⃣: عرض جميع الأدوية

```sql
SELECT * FROM medications LIMIT 10;
```

**الشرح:**
- `SELECT *` = اعرض جميع الأعمدة
- `FROM medications` = من جدول الأدوية
- `LIMIT 10` = اعرض أول 10 فقط

**النتيجة:**
```
ID  | Trade Names | Scientific Name | Coverage
----|-------------|-----------------|----------
1   | Panadol     | Acetaminophen   | Covered
2   | Aspirin     | ASA             | Not Covered
...
```

#### مثال 2️⃣: البحث عن دواء معين

```sql
SELECT * FROM medications 
WHERE scientific_name LIKE '%Paracetamol%';
```

**الشرح:**
- `WHERE` = شرط البحث
- `LIKE '%Paracetamol%'` = ابحث عن كلمة تحتوي على "Paracetamol"
- `%` = أي أحرف قبل وبعد

**مثال آخر:**
```sql
SELECT * FROM medications 
WHERE trade_names LIKE '%Panadol%';
```

#### مثال 3️⃣: تحديث دواء واحد

```sql
UPDATE medications 
SET coverage_status = 'Covered'
WHERE scientific_name = 'Acetaminophen';
```

**الشرح:**
- `UPDATE medications` = عدّل جدول الأدوية
- `SET coverage_status = 'Covered'` = غيّر حالة التغطية إلى "مغطى"
- `WHERE scientific_name = 'Acetaminophen'` = فقط للدواء "Acetaminophen"

**النتيجة:** تم تحديث 1 دواء ✅

#### مثال 4️⃣: تحديث أدوية متعددة

```sql
UPDATE medications 
SET coverage_status = 'Not Covered'
WHERE indication LIKE '%Diabetes%';
```

**الشرح:**
- يحدّث جميع الأدوية التي تستخدم لـ "Diabetes"
- يغيّر حالتها إلى "غير مغطى"

#### مثال 5️⃣: إضافة دواء جديد

```sql
INSERT INTO medications (trade_names, scientific_name, indication, icd_codes, coverage_status)
VALUES ('Panadol', 'Acetaminophen', 'Pain, Fever', 'R50.9, M79.3', 'Covered');
```

**الشرح:**
- `INSERT INTO` = أضف صف جديد
- `(trade_names, scientific_name, ...)` = الأعمدة المراد ملأها
- `VALUES (...)` = القيم

#### مثال 6️⃣: إضافة عدة أدوية دفعة واحدة

```sql
INSERT INTO medications (trade_names, scientific_name, indication, icd_codes, coverage_status)
VALUES 
('Panadol', 'Acetaminophen', 'Pain', 'R50.9', 'Covered'),
('Aspirin', 'Acetylsalicylic Acid', 'Pain', 'M79.3', 'Not Covered'),
('Ibuprofen', 'Ibuprofen', 'Inflammation', 'M19.90', 'Covered');
```

**النتيجة:** تمت إضافة 3 أدوية ✅

#### مثال 7️⃣: حذف دواء

```sql
DELETE FROM medications 
WHERE scientific_name = 'Acetaminophen';
```

**⚠️ تحذير:** هذا سيحذف جميع الأدوية بهذا الاسم!

#### مثال 8️⃣: عد عدد الأدوية

```sql
SELECT COUNT(*) as total_medications FROM medications;
```

**النتيجة:**
```
total_medications
-----------------
46847
```

#### مثال 9️⃣: البحث عن أدوية بدون معلومات تغطية

```sql
SELECT * FROM medications 
WHERE coverage_status IS NULL 
OR coverage_status = '';
```

**الشرح:**
- `IS NULL` = الحقل فارغ
- `OR` = أو

---

## الطريقة 3️⃣: Database UI (الأبسط بصرياً)

### الخطوة 1: فتح Database Panel

```
1. اذهب إلى Management UI
2. اضغط على "Database"
3. ستشوف قائمة الجداول على اليسار
```

### الخطوة 2: اختيار الجدول

```
1. اضغط على "medications" (الأدوية)
2. ستشوف قائمة بجميع الأدوية
3. كل صف = دواء واحد
```

### الخطوة 3: تعديل سجل

```
1. اضغط على الدواء الذي تريد تعديله
2. ستفتح نافذة التعديل
3. غيّر الحقول المطلوبة
4. اضغط "Save"
```

### الخطوة 4: إضافة سجل جديد

```
1. اضغط زر "Add Record"
2. ملأ الحقول
3. اضغط "Save"
```

### الخطوة 5: حذف سجل

```
1. اضغط على السجل
2. اضغط "Delete"
3. أكد الحذف
```

---

## 📊 جدول المقارنة بين الطرق الثلاث

| المعيار | Admin Panel | SQL Queries | Database UI |
|--------|-----------|-----------|-----------|
| **السهولة** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **السرعة** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **تعديل واحد** | ✅ الأفضل | ❌ معقد | ✅ جيد |
| **تعديل كثير** | ❌ بطيء | ✅ الأفضل | ⭐ وسط |
| **البحث** | ✅ جيد | ✅ ممتاز | ⭐ وسط |
| **الحذف** | ✅ آمن | ⚠️ خطير | ✅ آمن |

---

## ⚠️ نصائح مهمة

### قبل أي تعديل:

```
1. ✅ اعمل Backup (نسخة احتياطية)
2. ✅ تأكد من البيانات الصحيحة
3. ✅ اختبر على عدد قليل أولاً
4. ✅ احفظ التغييرات
```

### كيفية عمل Backup:

```sql
-- PostgreSQL
\COPY (SELECT * FROM medications) TO 'medications_backup.csv' CSV HEADER;
```

### استرجاع من Backup:

```sql
-- استعادة البيانات
\COPY medications FROM 'medications_backup.csv' CSV HEADER;
```

---

## 🔍 أمثلة عملية متقدمة

### مثال 1: تحديث جميع أدوية الألم

```sql
UPDATE medications 
SET coverage_status = 'Covered'
WHERE indication LIKE '%Pain%';
```

### مثال 2: إيجاد أدوية بدون أكواد ICD-10

```sql
SELECT * FROM medications 
WHERE icd_codes IS NULL 
OR icd_codes = '';
```

### مثال 3: حساب عدد الأدوية المغطاة

```sql
SELECT 
  coverage_status,
  COUNT(*) as count
FROM medications
GROUP BY coverage_status;
```

**النتيجة:**
```
coverage_status | count
----------------|-------
Covered         | 30000
Not Covered     | 16847
NULL            | 0
```

### مثال 4: إيجاد أدوية مكررة

```sql
SELECT scientific_name, COUNT(*) 
FROM medications 
GROUP BY scientific_name 
HAVING COUNT(*) > 1;
```

### مثال 5: حذف الأدوية المكررة

```sql
DELETE FROM medications 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM medications 
  GROUP BY scientific_name
);
```

---

## 🆘 استكشاف الأخطاء

### المشكلة: "Error: Column not found"

**الحل:**
```
تأكد من اسم العمود:
- trade_names ✅
- scientific_name ✅
- indication ✅
- icd_codes ✅
- coverage_status ✅
```

### المشكلة: "Error: Syntax error"

**الحل:**
```
تأكد من:
1. علامات الاقتباس: 'text' ✅
2. الفواصل: , ✅
3. النقطة والفاصلة: ; ✅
```

### المشكلة: "No rows affected"

**الحل:**
```
قد تكون البيانات غير موجودة:
1. تحقق من البحث
2. استخدم LIKE بدلاً من =
3. استخدم SELECT أولاً للتحقق
```

---

## ✅ قائمة التحقق

قبل أي تعديل:

- [ ] عملت Backup؟
- [ ] اختبرت على عدد قليل؟
- [ ] تأكدت من البيانات الصحيحة؟
- [ ] كتبت الأمر بشكل صحيح؟
- [ ] تحققت من النتائج؟
- [ ] حفظت التغييرات؟

---

## 📞 الدعم

إذا واجهت مشكلة:

1. **تحقق من الدليل أعلاه**
2. **جرب مثال بسيط أولاً**
3. **استخدم SELECT للتحقق**
4. **اعمل Backup قبل الحذف**

---

**نجاح! الآن أنت تستطيع تعديل Database بسهولة! 🎉**
