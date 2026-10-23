# Pi Durable analizi — Nekibuki için

<!-- 2026-10-24 · vision sağlayıcısı ve ajan runtime'ı değerlendirmesi -->

Bu doküman iki soruyu ayırıyor:

1. **Vision** — Gemini yerine OpenCode'un ücretsiz API'si (veya ters mühendislik) kullanılabilir mi?
2. **Agent runtime** — Pi Durable bir Worker/Durable Object içinde çalıştırılıp adım adım yürüyüş akışı oraya taşınmalı mı?

Kısa cevap: **Vision için OpenCode'un ücretsiz katmanı kullanılamaz. Pi Durable, tek atımlık fotoğraf analizi için yanlış araç; ancak adım adım yürüyüş akışı için doğru araç ve bu depoda uygulandı.**

---

## 1. OpenCode API'si

### Ne olduğu

OpenCode Console (eski adı Zen) bir AI gateway. OpenAI Chat Completions, OpenAI Responses, Anthropic Messages ve Google Generative AI uçlarını tek bir anahtar altında sunuyor. Ücretsiz modeller de var; aralarında görsel girdi alan `nemotron-3.5-super-vl-free` de listeleniyor.

### Ücretsiz katman programatik kullanılamıyor

Doküman açık: *"Free-tier chat models require OpenCode; use paid models or Go from other clients."*

Ölçülen davranış (2026-10-24):

```
POST https://opencode.ai/inference/openai/v1/chat/completions
{ "model": "nemotron-3.5-super-vl-free", ... }

→ 403 {"type":"FreeTierError","message":"OpenCode's free tier can only be used from within OpenCode."}
```

`Authorization: Bearer public` ile de aynı yanıt geliyor. Yani kapı anahtarla değil, **istemci kimliğiyle** korunuyor. Aşmanın tek yolu OpenCode istemcisini taklit etmek olurdu:

- OpenCode kullanım koşullarının ihlali,
- hesap/anahtar banı riski,
- habersiz kırılma (sürüm, header, imza değişir),
- ve asıl sorun: **kullanıcı fotoğraflarının hukuki durumu**. Ücretsiz uçların bir kısmı "trial use only — do not submit personal or confidential data" diyor; bir kısmı veriyi model eğitiminde kullanıyor. Konum + fotoğraf gönderen bir gezi uygulaması için bu kabul edilebilir bir risk değil.

> **Karar: ters mühendislik yapılmayacak.**

### Meşru seçenekler

| Yol | Model | Girdi / Çıktı ($/1M) | Programatik? | Not |
| --- | --- | --- | --- | --- |
| Gemini doğrudan (mevcut) | `gemini-3.1-flash-lite` | 0.25 / 1.50 | ✅ | Free tier $0, ama veri ürün geliştirmede kullanılıyor |
| Gemini + AI Gateway | `gemini-3.1-flash-lite` | 0.25 / 1.50 | ✅ | Log, cache, fallback; kodda `AI_GATEWAY_URL` zaten var |
| OpenCode Console (ücretli) | `gemini-3.5-flash-lite` | 0.30 / 2.50 | ✅ | "Applications calling the endpoints directly" destekli |
| OpenCode Console (ücretli) | `deepseek-v4-flash-vision-exp` | 0.14 / 0.28 | ✅ | En ucuz vision; deneysel |
| OpenCode Go ($10/ay) | çoğunlukla metin modelleri | — | ⚠️ | Pi doğrulanmış istemci, ama Go "coding agent trafiği" için; uygulama backend'i olarak kullanmak abuse tespitine takılabilir |
| Workers AI | `llama-3.2-11b-vision`, `llama-4-scout`, `moondream3.1` | çok düşük | ✅ | Anahtar yok, 10k neuron/gün ücretsiz; anıt tanımada Gemini'nin belirgin altında |

### Maliyet gerçeği

Bir analiz kabaca 2–3k girdi (prompt + görsel) ve ~2k çıktı tokenı. `gemini-3.1-flash-lite` ile:

```
0.0025M × $0.25 + 0.002M × $1.50 ≈ $0.0036
```

Yani **1 dolar ≈ 250–300 analiz**. Vision maliyeti zaten gürültü seviyesinde. OpenCode'a geçmenin maliyet gerekçesi yok; tek gerçek gerekçe model kalitesi veya sağlayıcı çeşitliliği olabilir.

---

## 2. Pi ve Pi Durable nedir

- **Pi** — minimal, genişletilebilir bir agent harness'ı (Mario Zechner / badlogic). Agent loop'u çalıştırır: transcript, follow-up/steer kuyruğu, model çağrıları, araçlar, retry, crash recovery.
- **Pi Durable** — Pi'nin dayanıklı (durable) katmanı. Storage adapter'ları (memory / JSONL / SQLite), kalıcı inbox ve task seti, scheduler, commit/transaction, subagent, ve bir conformance suite.
- **`PiHarness`** — Cloudflare Agents SDK'nın Pi'yi Durable Object'e bağlayan Lifecycle capability'si. İki şey verir:
  - **Storage:** Pi kendi tablolarını (`pi_*`) DO'nun SQLite'ında tutar.
  - **Wake-up:** Pi'nin bellekteki scheduler'ı eviction'da kaybolur; Lifecycle job + alarm + 30 sn heartbeat bunu telafi eder. Object eviction/crash/deploy görürse alarm yeniden başlatır, Pi checkpoint'ten devam eder.

Temel API: `prompt / submit / wait / steer / abort / pending / retry / reset / setModel / messages / events / busy`, `sessions.create/fork/list`, `ToolRegistration` (`replay: "safe" | "unsafe"`).

Durum: **beta / experimental.** `PiHarness` API'si minor sürümlerde değişebilir; her `agents` sürümü tek bir Pi minor sürümünü destekler (peer `~1.4.0`).

---

## 3. Nekibuki'ye uyum

| Akış | Bugün | Pi'ye taşınırsa | Kazanç |
| --- | --- | --- | --- |
| `POST /api/analyze` | Tek istek → tek model çağrısı → şema doğrulamalı JSON | Agent loop + tool registry + transcript + DO süresi | **Yok.** Tek atımlık dönüşüm; ajan loop'u sadece gecikme ve karmaşıklık ekler |
| `POST /api/analyses/:id/chat` | Tek soru → tek cevap; geçmiş D1'de | Streaming, resumable, araçlar, kalıcı hafıza, alt oturumlar | Ürün bunları istemiyorsa **yok**; istiyorsa **yüksek** |
| "Sonraki kare" akışı | `continuation` alanı prompt'a taşınıyor | Ajan adımı | **Yok.** Zaten çözülmüş |

### Pi gerçekten nerede değer üretir

- Rehberin **çok adımlı yürüyüş** planlaması: adım adım fotoğraf istemek, her kareyi görmek, planı güncellemek, kesintiye dayanmak.
- Chat'e **araç** vermek: yakındaki yerler, hava durumu, açılış saatleri, çeviri, rotaya ekle.
- **Zamanlanmış iş**: "yarın sabah için yürüyüş özeti", "bu akşam bu rotayı hatırlat".
- **Uzun ömürlü araştırma** + alt ajanla geçmiş sohbetlerde arama.
- Çok cihaz, kopan bağlantıya devam, aynı oturuma birden fazla kişi.

Bunların hiçbiri bugünkü üründe yok. `chat-panel.tsx` tek POST atıp tek cevap alıyor.

---

## 4. Limitler ve maliyet (Pi bir DO'da çalışırsa)

| Kaynak | Workers Free | Etki |
| --- | --- | --- |
| DO istekleri | 100.000 / gün | Bol |
| DO süresi | 13.000 GB-s / gün | 128 MB × 30 sn ≈ 3.8 GB-s / tur → ~3.400 tur/gün |
| DO storage | 5 GB toplam, 1 GB / object | Transcript için fazlasıyla yeterli |
| Satır yazımı | 100.000 / gün | Her mesaj/araç sonucu yazım; orta trafikte yeter |
| Worker bundle | 64 MiB sıkıştırılmamış, gzip limiti yok | Pi + Agents SDK sığar |
| CPU | DO: 30 sn/istek | Yeterli |
| Alarm | 15 dk duvar saati | 15 dk'dan uzun tek model stream'i kesilebilir (Pi 10 dk'da devrediyor) |

Not: SQLite DO storage faturalandırması Ocak 2026'dan itibaren geçerli; ücretsiz plan limitleri yukarıdaki gibi.

---

## 5. Entegrasyon planı (karar "evet" olursa)

1. Bağımlılıklar: `agents`, `@earendil-works/pi-durable`, `@earendil-works/pi-ai`, `@earendil-works/chord` — sürümleri `agents` sürümüne pinle.
2. `wrangler.jsonc`: `durable_objects` binding + `migrations: [{ tag, new_sqlite_classes: ["ChatAgent"] }]`.
3. `ChatAgent` sınıfı: `Agent` (Agents SDK) veya düz `DurableObject` + `PiHarness` + `Lifecycle.install(this).use(harness)`.
4. Worker: `/api/analyses/:id/chat` içinde **auth kontrolü Worker'da kalır**, sonra `env.ChatAgent.getByName(analysisId)` çağrılır. DO dışarıya açılmaz.
5. Model: `agents/models/pi-ai` + AI Gateway (Gemini) veya Workers AI. `OPENCODE_API_KEY` kullanılacaksa yalnızca **Console ücretli** anahtar.
6. Client: önce `submit` + `wait` ile mevcut POST sözleşmesi korunur; streaming gerekirse WebSocket'e geçilir.
7. **`/api/analyze` yoluna dokunulmaz.** Vision tek çağrı olarak kalır. Ajanın fotoğrafı görmesi gerekirse R2 anahtarını verip bir `look` aracı yazılır.
8. Feature flag arkasında başlat; D1 chat geçmişiyle çift yazma dönemi yaşanır.

---

## 6. Riskler

- **API kararsızlığı:** PiHarness beta, Pi Durable experimental. Minor sürümde kırılma normal.
- **Platform şekli:** Worker, Agents SDK `Agent` sınıfına döner. Hono dış router olarak kalabilir ama kod tabanı iki paradigmaya bölünür.
- **Onay akışı yok:** Pi Durable'da tool permission/approval adımı henüz yok. Kullanıcı verisiyle yan etkili araç çalıştırmak riskli.
- **Event replay yok:** Stream her zaman snapshot'tan başlar; cursor yok.
- **Session silme yok:** KVKK/GDPR silme talebi için manuel tablo temizliği gerekir.
- **Eşzamanlılık:** DO tek iş parçacığı ama `await` sırasında istekler iç içe girer; uygulama seviyesinde kilit (`active` bayrağı) gerekir.
- **Abuse riski:** OpenCode Go "coding agent trafiği" için; bir gezi uygulamasının vision backend'i olarak kullanmak tespit edilebilir.
- **Auth sınırı:** Better Auth oturumu DO'ya taşınmamalı. Worker doğrular, DO'ya yalnızca `userId` geçer.

---

## 7. Ürün yönü: adım adım yürüyüş (2026-10-24 güncellemesi)

Ürün kararı netleşti: uygulama tek fotoğraflık rehber değil, **bir yürüyüşü adım adım ilerleten rehber** olacak. İlk fotoğraf akışı başlatır; rehber kişiyi bir sonraki durağa yönlendirir; orada çekilen fotoğrafla o durağın hikâyesi anlatılır.

Paylaşılan Dolmabahçe sohbeti bu akışın çalışan bir spesifikasyonu. Tur başına desen:

1. **Varış** — kullanıcı bir fotoğraf ya da oda adı verir ("Kristal merdivenlerden çıktık").
2. **O an** — buranın ne olduğu, neden böyle yapıldığı (2–4 paragraf).
3. **Neye bakmalı** — o anda görülebilecek 2–3 somut detay.
4. **Akılda kalacak cümle** — tek cümlelik özet.
5. **Sonraki durak** — "şu yöne ilerleyin, şu tabelayı arayın" biçiminde somut talimat.

Desenin kritik davranışları:

- Kullanıcı sırayı bozarsa plana değil **kullanıcıya** uyulur; "sıradaki" talimatı yeniden hesaplanır.
- Atlanan durak fark edilir ve geri dönüş önerilir (Atatürk'ün odası örneği).
- "Gerçek düzen mi, müze düzeni mi" gibi sorulara dürüst cevap verilir.
- Gerektiğinde **web araması** yapılır (gişe saati, 71 numaralı oda, Japon Bahçesi'nin 2003'te yapılması) ve kaynak gösterilir.

### Bunun Pi kararına etkisi

Önceki "Pi'yi şimdi ekleme" sonucu **geçersiz**. Yürüyüş akışı:

- saatler sürer, telefon kilitlenir, ağ kopar → **dayanıklı oturum** gerekir,
- duraklar arasında dakikalarca boşta kalır → **hibernation** gerekir,
- her durakta yeni fotoğraf gelir → **kalıcı state + uyanma** gerekir,
- zaman zaman araç gerekir (yer bilgisi, saat, arama) → **tool loop** gerekir.

Bu, Pi Durable + DO'nun tam olarak çözdüğü problem. Ama bir şartla: **rota modelin kararı olmamalı.**

Doğru ayrım:

| Katman | Sahibi | Neden |
| --- | --- | --- |
| Yürüyüş planı (durak sırası, koordinat, süre) | **Kod / veri** | Deterministik olmalı; model rotayı kaydırmamalı |
| "Hangi duraktayız?" | **Vision + GPS** | Fotoğraf ve konum kanıtı; model tahmin etmemeli |
| O durağın hikâyesi | **LLM** | Fotoğraftaki detaya bağlı anlatı |
| Sonraki talimat | **Plan + LLM** | Sıra koddan, cümle modelden |
| Oturum, ilerleme, kesintiye dayanma | **DO (+ Pi)** | Durağan state ve uyanma |

Yani Pi'yi "rehberin beyni" yapmak yerine **anlatıcı + araç çalıştırıcı** olarak kullanmak gerekir. Aksi halde ajan kendi rotasını uydurur; paylaşılan sohbette kullanıcının şikâyet ettiği "ters gidiyoruz" durumu tam olarak budur.

### İki uygulama yolu

**A. Düz DO state machine.** DO'da `walk_session` + `visits`; her fotoğrafta iki çağrı: (1) vision ile durak doğrula, (2) o durağın hikâyesini üret. Pi yok. Daha az bağımlılık, tam kontrol, beta API riski yok.

**B. Pi Durable.** Aynı DO'nun içinde `PiHarness`; `go_to_stop`, `finish_stop`, `walk_status` araçları. Kazanç: kesintiden sonra devam, araç genişletilebilirliği, hibernation, ileride arama/zamanlama/alt ajan. Maliyet: beta API, daha büyük yüzey, onay akışının olmaması.

**Karar: B.** Ürün sahibi genişletilebilirlik ve kolay entegrasyon için Pi Durable'ı seçti. Yine de rota modelin kararı değil: plan `shared/walks.ts` içinde veri, ilerleme `WalkStore` içinde SQLite, model yalnızca anlatı ve araç çağrısı yapıyor.

---

## 8. Uygulama

| Parça | Dosya | Görev |
| --- | --- | --- |
| Yürüyüş planı | `shared/walks.ts` | Durak sırası, alias'lar, bakılacak detaylar, varış tarifi |
| Pi DO | `worker/walk/agent.ts` | `PiHarness` + `Lifecycle`, sistem promptu, üç araç, fotoğraf okuma |
| Rota/ilerleme | `worker/walk/store.ts` | `walk_state`, `walk_visit` tabloları; deterministik sıradaki durak |
| API | `worker/routes/walks.ts` | Plan listesi, oturum başlatma, mesaj/fotoğraf, reset |
| Binding | `wrangler.jsonc` | `AI`, `WALK_AGENT`, `new_sqlite_classes` migration, `WALK_MODEL` |

Akış:

1. `POST /api/walks` → DO adı `<user>:<walkId>` → `WalkAgent.start()` → ilk durak.
2. `POST /api/walks/:id/message` → metin ve/veya fotoğraf.
3. Fotoğraf varsa R2'ye yazılır, DO onu mevcut `VisionProvider` ile bir kez okur ve Pi'ye kanıt olarak verir.
4. Pi, `<walk>` bölümündeki güncel duruma göre cevap üretir; gerekirse `go_to_stop` / `finish_stop` çağırır.
5. Cevap + güncel snapshot döner. Aynı `operationId` ile tekrar denemek ikinci bir cevap üretmez.

### On-the-fly turlar (2026-10-24 güncellemesi)

Statik plan artık bir başlangıç noktası, tek yol değil. Analiz raporundaki "Tur başlat"
butonu fotoğrafın konumunu ve rapor bağlamını `POST /api/walks`'a taşıyor:

1. `worker/lib/overpass.ts` — fotoğrafın ~800 m çevresindeki adlandırılmış tarihi/turistik
   POI'leri Overpass'tan çeker, mesafeye göre sıralar, en fazla 25 aday verir.
2. `worker/walk/planner.ts` — `WALK_PLANNER_MODEL` adaylardan 5–8 durak seçer ve anlatıyı yazar.
   Çıktı katı JSON şemasına karşı doğrulanır; bir kez retry edilir.
3. `worker/walk/plan.ts` — koordinatlar yalnızca OSM adayından gelir, ilk durak en yakın seçili
   durak olur, `arriveBy` mesafe + pusula yönünden üretilir. Model koordinat yazamaz.
4. Plan JSON'u `WalkStore`'un `walk_state.plan_json` kolonunda saklanır (`ALTER TABLE` ile geriye
   uyumlu). `WalkStore.plan()` önce saklanan planı, yoksa statik planı döndürür.
5. D1 `walks` tablosu turu hesaba bağlar (`user_id`, `analysis_id`, başlık, dil, ilerleme,
   durum). `GET /api/walks` açık turları döndürür; rapor ve Places ekranı "Devam et" gösterir.

Overpass veya planner başarısız olursa tur üretilmez; kullanıcıya `walk_map_unavailable`,
`walk_too_few_places`, `walk_plan_failed` gibi adlandırılmış bir hata döner. Konum yoksa
`walk_location_required` döner ve istemci hazır planı (varsa) alternatif olarak sunar.

### Bilinen sınırlar

- `PiHarness` beta; sürüm yükseltmelerinde API değişebilir.
- Tool onayı yok; bu yüzden araçlar yalnızca rota state'ini değiştiriyor, dış yan etki üretmiyor.
- Event replay cursor yok; istemci yeniden bağlanınca snapshot almalı.
- Alarm 15 dakika ile sınırlı; tek bir model çağrısı bu süreyi aşarsa kesilebilir.
- Session silme yok; bir yürüyüşü silmek için DO'yu `deleteAll()` ile birlikte kaldırmak gerekir.
- Yerel `wrangler dev` Workers AI'ı simüle edemiyor; model çağrısı için uzak binding/oturum gerekir.

---

## 9. Sonuç

| Karar | Durum |
| --- | --- |
| Vision sağlayıcısı | Gemini'de kalıyor (doğrudan veya AI Gateway). OpenCode Console **ücretli** ve Workers AI sağlayıcıları `VisionProvider` arkasına eklenebilir. |
| OpenCode ücretsiz katmanı | Kullanılmıyor. Programatik erişim kapalı; aşmak ToS ihlali ve veri riski. |
| Yürüyüş akışı | Plan kodda, ilerleme SQLite'ta, anlatı modelde. |
| Pi Durable | **Uygulandı**: her yürüyüş için bir `WalkAgent` DO, `PiHarness` + `Lifecycle`, SQLite migration. |
| Sonraki adım | İstemci akışını `/api/walks` üzerine bağlamak; durak doğrulamayı GPS ile güçlendirmek; web araması/araç onayı gerektiğinde Pi extension'larını genişletmek. |
