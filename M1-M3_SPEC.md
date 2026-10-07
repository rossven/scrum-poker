# SprintMasası — M1-M3 Uygulama Dökümanı

> Bu döküman Claude Code içindir. Önce tamamını oku. Sonra **M1 → M2 → M3** sırasıyla ilerle. Her milestone sonunda dur, çalışan halini ve nasıl denendiğini kısaca özetle, onay iste. Belirsiz yerlerde makul bir varsayım yap, sonunda "Varsayımlar" bölümüne yaz. Gereksiz soru sorma.

## 1. Bu sürümün amacı

Proje sahibinin **kendi yazılım ekibinde sprint planlamada kullanacağı**, ücretsiz, hesapsız bir araç. Ticari hedef yok; amaç ekibin gerçekten kullanması ve 6-8 hafta içinde başka ekiplere yayılıp yayılmadığını görmek.

Üç şey yapacak:
1. Linkle girilen bir **oturum odası** (M1).
2. Avatarlı, masa etrafında oturulan **Planning Poker** (M2).
3. Poker sonrası işi kimin alacağına karar veren **gönüllü + mini oyun** akışı (M3).

### Bu sürümde YOK (yapma)
Retro, rapor/PDF dışa aktarım, hesap/giriş, ödeme, Jira/Slack entegrasyonu, kalıcı takım alanı, veritabanı, mobil uygulama. Bunlar sonraki aşamada. Ama kodu, ileride eklenmelerini zorlaştırmayacak şekilde düzenle (özellikle durum saklama arayüzü, bkz. 5).

## 2. Kullanıcı rolleri

| Rol | Yetki |
|---|---|
| **Moderatör** | Odayı açan kişi. Ticket girer/değiştirir, kartları açar, tekrar oylama başlatır, final tahmini onaylar, atama oyununu başlatır, başka birini moderatör yapabilir. |
| **Katılımcı** | Oy verir, gönüllü olur, oyunlara katılır. |
| **Gözlemci** | Sadece izler, oy vermez. Katılırken seçilir. |

Kimlik: takma ad + avatar. Tarayıcıda saklanan rastgele bir token ile aynı kişi sayfayı yenilese veya bağlantısı kopsa aynı koltuğa geri döner. Hesap yok.

## 3. Teknoloji

- **Backend:** Java 21, Spring Boot 3, Maven, WebSocket (STOMP), `SecureRandom`.
- **Frontend:** React + TypeScript (Vite), Framer Motion (animasyon), CSS modülleri veya Tailwind (birini seç, tutarlı kal). Durum yönetimi için Zustand veya benzeri hafif bir çözüm.
- **Depo yapısı:** tek repo, `/backend` ve `/frontend`. Frontend build'i Spring Boot'un statik dosyalarına kopyalanır, tek JAR/tek Docker imajı olarak çalışır.
- **Veri:** Veritabanı yok. Oda durumu **bellekte** tutulur. Bir `RoomRepository` arayüzü arkasında yaz, ileride kalıcı depo eklenebilsin. Hareketsiz odalar yapılandırılabilir süre sonra (varsayılan 7 gün) temizlenir; moderatör odayı elle de kapatabilir.
- **Dağıtım:** Dockerfile ve tek komutla yerelde çalıştırma (`docker compose up` veya benzeri). Küçük bir VPS/PaaS yeterli.
- **Dil:** Arayüz **Türkçe**. Tüm metinler çeviri anahtarlarıyla tutulsun (i18n altyapısı kur, şimdilik sadece `tr`; İngilizce eklemek dosya eklemekten ibaret olsun).

## 4. Tasarım yönü

- Ton: sıcak, sakin, kumar/casino hissi **yok**. Neon, kırmızı-siyah, "poker chip" estetiğinden kaçın.
- Masa: yumuşak, mat bir yüzey (örn. sıcak ahşap veya soluk nötr tonlar), oval/yuvarlak. Katılımcılar masanın etrafında avatar ve isimleriyle oturur.
- Kartlar: iskambil kağıdı hissi (yuvarlatılmış köşe, hafif gölge), sade tipografi. Elde yelpaze gibi dizilir, seçilen kart yukarı kalkar, açılırken çevrilir (flip).
- Açık ve koyu tema (sistem tercihine uyar, elle değiştirilebilir).
- Animasyonlar `prefers-reduced-motion` ayarına saygı gösterir. Sesler varsayılan **kapalı**, tek tuşla açılır.
- Mobil tarayıcıda kullanılabilir olmalı: dar ekranda masa yerine yarım daire/liste yerleşimi, kartlar alt çubukta kaydırılabilir.
- Avatarlar: lisansı uygun, üretici tabanlı SVG avatar kütüphanesi seç (lisansı Varsayımlar'a yaz). Seçim ekranında birkaç rastgele öneri + yenile butonu.

---

## 5. M1 — İskelet ve oda

**Amaç:** İki üç tarayıcıdan aynı odaya girip birbirini canlı görmek.

### Gereksinimler
- Ana sayfada "Oda oluştur" butonu. Oda, tahmin edilmesi zor, kısa bir kod (örn. 6-8 karakter) ve paylaşılabilir link üretir. Kodu elle yazarak girme alanı da olsun.
- Oda oluşturma ekranı: oda adı (opsiyonel), başlangıç destesi (varsayılan Modifiye Fibonacci), opsiyonel şifre.
- Katılma ekranı: takma ad (zorunlu, 1-24 karakter), avatar seçimi, "Gözlemci olarak katıl" seçeneği, şifreli odada şifre alanı.
- Lobi/oda görünümü: katılanların listesi (avatar + isim + rol), moderatör rozeti, bağlantı durumu (çevrimiçi/çevrimdışı). Link kopyalama butonu.
- Odayı açan kişi otomatik moderatör. Moderatör bir kişiyi moderatör yapabilir. Moderatör ayrılırsa ve başka moderatör yoksa, en eski bağlı katılımcıya otomatik devredilir.
- Gerçek zamanlı: biri girince/çıkınca herkeste anında güncellenir.
- **Yeniden bağlanma:** Tarayıcı token'ı ile aynı kimliğe dönüş. Bağlantı kopunca istemci otomatik tekrar dener, geri gelince `state_snapshot` ile tam durumu alır.
- Aynı odada isim çakışırsa kullanıcıya bildir veya sonuna numara ekle.
- **Katılımcı sayısı:** Ürün düzeyinde sabit/düşük bir sınır yok ("sınırsız katılımcı" hedefi). Yalnızca bir güvenlik tavanı konur: oda başına varsayılan 100 bağlı kişi, ortam değişkeniyle ayarlanır. Arayüz 12+ kişide de okunabilir kalmalı (masa yerleşimi kalabalıkta iki sıra/daha küçük avatarlara geçer).
- **Oda şifresi (opsiyonel):** Oda oluştururken şifre konabilir. Şifre sunucuda güçlü bir algoritmayla (bcrypt veya argon2) hash'lenir, açık metin saklanmaz/loglanmaz. Şifreli odaya katılırken şifre sorulur; yanlış deneme sayısı IP/oda başına sınırlanır. Doğru şifreyle girmiş kişi, yeniden bağlanırken tekrar şifre girmek zorunda kalmaz (oturum token'ı geçerlidir). Moderatör şifreyi sonradan değiştirebilir veya kaldırabilir.
- **Oda ömrü:** Oda moderatör "Odayı kapat" diyene kadar açık kalır (zaman dilimleri arası/asenkron kullanım için). Hareketsiz oda temizliği varsayılan 7 gün (ortam değişkeniyle ayarlanır). Moderatör odayı kapatınca herkes bilgilendirilir ve oda silinir. Sunucu yeniden başlarsa bellekteki odaların kaybolması kabul edilir.

### Mimari notlar
- **Sunucu otoriterdir.** İstemci "niyet" gönderir, sunucu doğrular ve durumu yayınlar. Yetki kontrolü (örneğin sadece moderatör kart açabilir) sunucuda yapılır.
- Oda durumu tek bir `Room` nesnesinde, oda başına tek iş parçacığında/kilitle değiştirilsin (yarış durumlarını önle).
- `RoomRepository` arayüzü: `find`, `save`, `delete`, `expireIdle`. Şimdilik bellek içi uygulama.
- WebSocket olay adları net ve versiyonlanabilir olsun (örn. `room.join`, `room.state`, `room.participant_left`). Olay şemalarını `docs/events.md` dosyasında belgele.

### Kabul kriterleri
- İki tarayıcı penceresi aynı odaya girince birbirini ≤ 1 sn içinde görür.
- Sayfa yenilenince aynı koltuğa geri dönülür.
- Moderatör olmayan biri moderatör olayı gönderirse sunucu reddeder ve durum değişmez (otomatik test).
- Şifreli odaya şifresiz veya yanlış şifreyle girilemez; doğru şifreyle girmiş kişi sayfayı yenileyince tekrar şifre sormadan geri döner (otomatik test). Şifre hiçbir yanıtta, logda veya olay mesajında görünmez.
- 30 sahte istemciyle (entegrasyon testi) bir odaya girildiğinde hepsi birbirini görür, mesaj kaybı olmaz.
- Sunucu yeniden başlatılınca odaların kaybolması **kabul edilir** ama istemci kullanıcıya anlamlı bir mesaj gösterir ("Oda bulunamadı, yeni oda aç").

---

## 6. M2 — Planning Poker masası

**Amaç:** Ekibin gerçekten sprint planlamada kullanabileceği poker deneyimi.

### Gereksinimler
- **Masa görünümü:** Katılımcılar masa etrafında avatar ve isimleriyle oturur. Oy veren kişinin önüne **kapalı kart** düşer. Oy vermeyenin önü boş. Gözlemciler masada oturmaz, kenarda "izleyiciler" olarak görünür.
- **Deste seçimi** (moderatör odada seçer, oda açılırken de belirlenebilir). Hazır desteler:
  - **Modifiye Fibonacci (varsayılan):** 0, ½, 1, 2, 3, 5, 8, 13, 21, 34, 55, ?, ☕
  - **Fibonacci:** 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕
  - **T-shirt:** XS, S, M, L, XL, ?, ☕
  - **Özel deste:** moderatör virgülle ayrılmış kart listesi girer (en fazla 20 kart, kart başına en fazla 8 karakter, tekrar eden kart olmaz). Girilen deste canlı önizlenir. Oluşturulan özel deste oda boyunca saklanır; moderatör sonra başka desteye geçebilir. Deste değişince mevcut turun oyları sıfırlanır ve herkes bilgilendirilir.
  - Sayısal istatistik için kartlar sayıya çevrilir: `½`, `0.5` ve `1/2` hepsi 0.5 sayılır. Sayıya çevrilemeyen kartlar (`?`, `☕`, T-shirt harfleri, serbest metin) ortalama/medyana girmez ama dağılımda gösterilir.
- **Oy verme:** Alt kısımdaki kart elinden bir kart seç, tekrar tıklayarak/başka kartı seçerek değiştir (açılana kadar). Seçilen kart masaya kapalı düşer.
- **Gizlilik (kritik):** Açılmadan önce hiçbir istemciye diğerlerinin oy değerleri **gönderilmez**. Sadece "X oy verdi" bilgisi gider. Kişi kendi oyunu görebilir.
- **Ticket:** Moderatör bir başlık (zorunlu) ve opsiyonel link/not girer. Çoklu ticket kuyruğu: ekle, sırala, sil, sıradakine geç. Ticket'ları toplu yapıştırarak (satır başına bir ticket) ekleme desteği.
- **Kartları aç:** Moderatör "Kartları aç" der. Tüm kartlar aynı anda çevrilir (flip animasyonu). Herkes oy verdiyse "Aç" vurgulanır ama zorunlu değildir.
- **Sonuç analizi:** Ortalama (sayısal destede), medyan, en sık seçilen değer, dağılım (kaç kişi hangi kartı seçti), en düşük ve en yüksek oyu verenlerin vurgusu, uzlaşı göstergesi (herkes aynı / yakın / dağınık). `?` ve `☕` hesaba katılmaz ama sayılır ve gösterilir.
- **Tekrar oylama:** Moderatör aynı ticket için yeni tur başlatır. Önceki turların oyları ticket geçmişinde saklanır.
- **Final tahmin:** Moderatör bir değer onaylar (varsayılan öneri: medyanın en yakın kart değeri). Ticket "tahmin edildi" durumuna geçer ve listede final değeriyle görünür.
- **Zamanlayıcı (opsiyonel):** Moderatör tartışma için geri sayım başlatabilir; süre bitince yumuşak görsel uyarı (ses varsayılan kapalı).
- **Klavye:** Sayı tuşları/ok tuşlarıyla kart seçimi, Enter ile onay.
- Gözlemci ve katılımcı arasında geçiş (moderatör veya kişinin kendisi, oy vermemişse).

### Mimari notlar
- `PokerRound` durumları: `VOTING` → `REVEALED` → (`VOTING` yeni tur | `FINALIZED`).
- Oylar sunucuda `Map<participantId, cardValue>`; `REVEALED` olmadan istemciye yalnızca `Set<participantId>` (kimler oy verdi) yayınlanır. Bunu **birim testiyle** doğrula (sızıntı testi).
- Bağlantısı kopan kişinin oyu tutulur, geri dönünce görür.
- Oy verdikten sonra odadan çıkan kişinin oyu açma sırasında geçerlidir (moderatör isterse sayımdan çıkarabilir).

### Kabul kriterleri
- 4 tarayıcıyla: herkes oy verir, kartlar açılmadan hiçbir ağ mesajında başkasının oyu görünmez (tarayıcı geliştirici araçlarında WebSocket çerçeveleri kontrol edilir).
- Açma anında tüm kartlar aynı anda çevrilir, istatistikler doğru hesaplanır (otomatik testler: ortalama, medyan, mod, `?`/`☕` istisnaları, `½`/`0.5`/`1/2` kartlarının 0.5 sayılması, tek kişi, eşitlik durumları).
- Özel deste doğrulaması: 20 karttan fazla, 8 karakterden uzun veya tekrar eden kart reddedilir; deste değişince tur oyları sıfırlanır ve bu herkese bildirilir (otomatik test).
- Tekrar oylama sonrası önceki tur geçmişte durur, final tahmin ticket'a yazılır.
- Mobil genişlikte (≈ 390 px) kart seçmek ve oy vermek rahat çalışır.

---

## 7. M3 — Atama / eşitlik bozma

**Amaç:** Tahmin bittikten sonra işi kimin alacağını eğlenceli ve adil bir şekilde belirlemek.

### Akış
1. Moderatör bir ticket için **"Kim alacak?"** adımını başlatır (poker sonrası buton olarak çıkar, ayrıca istediği an da başlatabilir).
2. **Gönüllü turu:** Herkesin ekranında "Ben alırım" butonu. Süre sınırı opsiyonel (varsayılan 20 sn). Tek gönüllü varsa iş ona atanır, oyun atlanır (moderatör isterse yine de oyun başlatabilir). Birden fazla gönüllü varsa adaylar gönüllüler olur. Hiç gönüllü yoksa adaylar tüm oy veren katılımcılardır.
3. **Aday ayarı:** Moderatör, oyundan önce kişileri adaylıktan çıkarabilir (örn. izinli, kapasitesi dolu).
4. **Oyun seçimi ve başlatma:** Moderatör bir oyun seçer ve başlatır.
5. **Sonuç:** Kazanan ticket'a atanır, kutlama animasyonu gösterilir, ticket listesinde "Atanan: X" görünür. Moderatör sonucu geri alıp yeniden oyun başlatabilir (geçmişte kalır).

### Oyunlar (bu milestone'da 2 tane)
1. **At yarışı:** Her adaya avatarıyla bir at/yarışçı. Animasyonlu yarış pisti, birinci kazanır. Yarış 6-10 saniye sürer; dramatik ama kısa. Yarışın akışı (hızlanma/yavaşlama, yer değiştirmeler) sunucunun belirlediği **sonuç sıralamasına uygun** üretilir (bkz. adalet kuralı).
2. **Şans çarkı:** Dilimler adaylardır (eşit ağırlıkta), çark döner ve kazananın dilimi üzerinde durur.

Oyun mimarisi: her oyun, ortak bir `TieBreakerGame` arayüzünü gerçekleştirsin (girdi: adaylar + ağırlıklar + rastgele kaynak; çıktı: sıralama + animasyon parametreleri). Yeni oyun eklemek yeni bir sınıf + yeni bir istemci bileşeni olsun.

### Adalet kuralı (kritik)
- Kazananı **sunucuda `SecureRandom`** ile belirle. İstemci sonucu etkileyemez; sadece sunucudan gelen sonucu animasyonla gösterir.
- Sonuç mesajı: kazanan, tam sıralama, kullanılan oyun, adaylar, zaman damgası. Oturum içinde "Atama geçmişi" listesinde görülebilir.
- **Ağırlık ayarı (varsayılan eşit):** "Dönüşümlü adalet" seçeneği: bu oturumda daha önce kazananların ağırlığı azaltılır (örn. her kazanımda yarıya iner). Moderatör açıp kapatabilir. Ağırlıklar çarkta dilim genişliği, yarışta başlangıç hızı yerine yalnızca **seçim olasılığı** olarak uygulanır; görsel olarak eşit görünür, bilgi çubuğunda "ağırlıklı mod açık" notu çıkar.
- Aynı odadaki herkes aynı sonucu aynı anda görür (sunucu zaman damgasıyla senkron başlatır).

### Kabul kriterleri
- Tek gönüllü varsa oyun çalışmadan atama yapılır.
- Aday çıkarma ve gönüllü kuralları doğru çalışır (otomatik testler).
- 10.000 deneme simülasyonunda (birim test) eşit ağırlıkta her adayın kazanma oranı beklenen aralıkta; ağırlıklı modda oranlar ağırlıklarla uyumlu.
- İstemci tarafında rastgelelik **kullanılmıyor** (kod incelemesiyle doğrulanır: `Math.random` sonuç belirlemede yok; sadece süs animasyonlarında olabilir).
- 4 tarayıcıda aynı kazanan, aynı sürede gösterilir.
- Sonuç kaydı ticket'a işlenir ve oda içinde listelenir.

---

## 8. Ölçüm (6-8 hafta karar için)

Kişisel veri içermeyen, oda/kullanım sayaçları tut (bellekte + günlük dosyaya yazılabilir):
- Açılan oda sayısı, oda başına en yüksek eşzamanlı katılımcı, tamamlanan poker turu sayısı, final onaylanan ticket sayısı, başlatılan atama oyunu sayısı (oyun tipine göre), oturum süresi.
- Basit bir `/admin/stats` uç noktası (sabit bir ortam değişkeniyle korunan token ile) JSON döner.
- İsim, avatar veya ticket başlığı gibi içerikleri istatistiğe **yazma**.

## 9. Teknik kalite ve güvenlik

- Giriş doğrulama: isim, ticket başlığı, kart değerleri sınırlı uzunluk ve karakter kümesi; XSS'e karşı tüm kullanıcı metni kaçışlanarak gösterilir.
- Oda kodları tahmin edilmesi zor (kriptografik rastgelelik), oda oluşturma ve WebSocket mesajlarında hız sınırlama.
- Gizli veri sızıntısı (açılmamış oylar) için otomatik test, bu testin geçmesi birleştirme koşulu.
- CORS ve WebSocket kaynak kontrolü yapılandırılır.
- Yapılandırılmış log (oda kodu ve olay tipi; kullanıcı içeriği loglanmaz).
- Testler: birim (istatistik, yetki, rastgelelik), entegrasyon (WebSocket ile 3-4 sahte istemci), ve en az bir uçtan uca senaryo (iki tarayıcı: gir → oy ver → aç → atama).
- Kısa bir `README.md`: nasıl çalıştırılır, nasıl dağıtılır, ortam değişkenleri, mimari özet.

## 10. Çalışma şekli (Claude Code için)

1. M1'i bitir, çalıştır, test et, kısa özet ver ve **dur**. Onay gelmeden M2'ye geçme. Aynısı M2 → M3 için.
2. Her milestone sonunda: nasıl denenir (komutlar), neler yapıldı, bilinen eksikler.
3. Mimariyi gereksiz karmaşıklaştırma: tek servis, veritabanı yok, minimum bağımlılık.
4. Proje sahibi Java'ya, frontend'e de hâkim; kod okunabilir, bileşenler küçük, karmaşık yerlerde kısa yorum olsun.
5. Kararları ve varsayımları aşağıdaki bölüme ekle.

## 11. Varsayımlar ve kararlar (Claude Code doldurur)

_Ürün adı, avatar kütüphanesi ve lisansı, CSS yaklaşımı, barındırma tercihi vb. burada kayda geçirilecek._

### M1

- **Ürün adı:** SprintMasası (dökümandaki ad korundu).
- **Derleme aracı:** Maven yerine **Gradle** (proje sahibinin tercihi). Gradle wrapper (8.14.3) repoda; ayrıca Gradle kurmak gerekmez.
- **Sürümler:** Spring Boot 3.5.6, React 19, Vite 7, TypeScript 5.9, Zustand 5, Framer Motion 12, react-i18next 16, @stomp/stompjs 7.
- **CSS yaklaşımı:** CSS Modules + `:root` üzerindeki CSS değişkenleri (Tailwind değil). Açık/koyu tema değişkenlerin yeniden tanımlanmasıyla yapılıyor; sistem tercihine uyar, başlıktaki düğmeyle Sistem → Açık → Koyu arasında değişir.
- **Avatar kütüphanesi:** DiceBear (`@dicebear/core` + `@dicebear/lorelei`, kod lisansı MIT). "Lorelei" stilinin tasarımı Lisa Wischofsky'ye ait, **CC0 1.0** (kamu malı), atıf zorunlu değil. Sunucu yalnızca avatar tohumunu (`[A-Za-z0-9_-]{1,32}`) saklar; görsel tarayıcıda üretilir.
- **Yönlendirme:** Üç sayfa için react-router yerine ~40 satırlık kendi yönlendiricimiz (`/`, `/yeni`, `/r/KOD`). Bağımlılık az kalsın diye.
- **Katılım akışı:** Oda oluşturma ve katılma REST ile (`POST /api/rooms`, `POST /api/rooms/{kod}/join`), canlı her şey STOMP ile. Şifre kontrolü ve hız sınırı böylece normal HTTP isteğinde yapılıyor, WebSocket yalnızca geçerli token ile açılıyor.
- **Odayı açanın moderatör olması:** Oda oluşturulunca tek kullanımlık bir `claimToken` dönüyor; tarayıcı bunu saklayıp katılırken gönderiyor. Linki önceden ele geçiren biri moderatörlüğü kapamıyor.
- **Oda kodu:** 8 karakter, karışabilecek harfler/rakamlar (0/O, 1/I/L) yok, `SecureRandom` ile; yaklaşık 8,5 × 10^11 olasılık. Büyük/küçük harf duyarsız.
- **İsim çakışması:** Sonuna numara eklenir ("Ayşe 2"). Karşılaştırma büyük/küçük harf duyarsız. 24 karakter sınırı numara dahil korunur.
- **Katılımcı tavanı:** "Bağlı kişi" yerine **koltuk sayısı** sayılıyor (çevrimdışı ama odadan çıkmamış kişiler de dahil). Daha basit ve öngörülebilir; varsayılan 100, `SM_MAX_PARTICIPANTS`.
- **Moderatör devri:** Moderatör koparsa hemen devredilmiyor; 20 sn (`SM_MODERATOR_GRACE_SECONDS`) bekleniyor ki sayfa yenileme moderatörlüğü kaybettirmesin. Sonra en eski bağlı katılımcıya (gözlemciler en sona) geçiyor. "Odadan çık" ile ayrılınca bekleme yok. Devirde eski moderatörün rozeti kalkar.
- **Yanlış şifre sınırı:** IP + oda başına 5 yanlış deneme / 5 dakika. Sınır dolunca o pencerede doğru şifre de kabul edilmez.
- **Yeniden bağlanma:** İstemci üstel beklemeyle (1 sn → en fazla 15 sn) tekrar dener; her bağlanışta `room.sync` ile `room.state_snapshot` alır. Sunucu "oda yok" derse denemeyi bırakıp "Oda bulunamadı, yeni oda aç" ekranını gösterir.
- **Mesaj sırası:** STOMP'ta hem gelen hem giden mesaj sırası korunuyor (`setPreserveReceiveOrder`, `setPreservePublishOrder`), eski bir durum yenisinin üstüne yazılmasın diye.
- **Hareketsiz oda:** Son etkinlikten 7 gün geçmiş **ve** kimsenin bağlı olmadığı odalar 15 dakikada bir silinir.
- **İstatistik (bölüm 8):** M1'de yalnızca oda sayısı ve en yüksek eşzamanlı katılımcı sayacı var; poker/atama sayaçları ilgili milestone'larda eklenecek. Günlük dosyaya yazma henüz yok, sadece bellek + `/admin/stats`.
- **Masa görünümü M1'de geldi:** Lobi zaten oval masa etrafında oturma düzeniyle çizildi (M2'de kartlar bunun üstüne eklenecek). 8/14/24 kişi eşiklerinde avatarlar küçülüyor, 16 kişiden sonra iki sıra; 640 px altında masa üstte, koltuklar ızgarada.
- **Sesler:** M1'de ses yok; açma/kapama düğmesi ses kullanılan ilk yerle (M2 zamanlayıcı) birlikte gelecek.
- **Barındırma:** Tek Docker imajı, tek kopya. Durum bellekte olduğu için yatay ölçekleme yok.

