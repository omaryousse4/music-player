# مشغل موسيقى (HTML + CSS + JS)

- تشغيل على الموبايل واللاب، مع زر "ملء الشاشة".
- وضع Offline عبر Service Worker.
- مزامنة كلمات LRC.
- حفظ الإعدادات في LocalStorage (آخر أغنية، الوقت، الصوت، Shuffle/Repeat، والثيم).
- PWA (Manifest + Service Worker) قابل للتثبيت.

## البدء
- افتح `index.html` عبر أي خادم محلي (مثال: `npx serve` أو Live Server).
- ضع ملفات MP3 داخل `songs/` وعدّل `songs/index.json` ليحتوي قائمة الأغاني.
- ضع ملفات LRC داخل `lyrics/` بنفس معرّف الأغنية (أو عيّن المسار في `songs/index.json`).

## بنية بيانات الأغنية
```json
{
  "songs": [
    {
      "id": "song-id",  
      "title": "عنوان الأغنية",
      "artist": "الفنان",
      "src": "/songs/song-file.mp3",
      "cover": "/assets/cover.jpg",
      "lyrics": "/lyrics/song-id.lrc"
    }
  ]
}
```

- يمكن إضافة ملفات محلية أثناء التشغيل عبر زر "إضافة ملفات" (لا تُحفظ بعد إعادة التشغيل).
- لتحسين أيقونة التثبيت: أضف أيقونات PNG داخل `assets/icons/` بأسماء `icon-192.png`, `icon-512.png`, و`maskable-512.png`.