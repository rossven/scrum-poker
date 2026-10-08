# SprintMasası — M1-M3 Uygulama Dökümanı

> Bu döküman Claude Code içindir. Önce tamamını oku. Sonra **M1 → M2 → M2.5 → M3** sırasıyla ilerle. Her milestone sonunda dur, çalışan halini ve nasıl denendiğini kısaca özetle, onay iste. Belirsiz yerlerde makul bir varsayım yap, sonunda "Varsayımlar" bölümüne yaz. Gereksiz soru sorma.

## 1. Bu sürümün amacı

Proje sahibinin **kendi yazılım ekibinde sprint planlamada kullanacağı**, ücretsiz, hesapsız bir araç. Ticari hedef yok; amaç ekibin gerçekten kullanması ve 6-8 hafta içinde başka ekiplere yayılıp yayılmadığını görmek.

Üç şey yapacak:
1. Linkle girilen bir **oturum odası** (M1).
2. Avatarlı, masa etrafında oturulan **Planning Poker** (M2), poker masası teması ve isteğe bağlı ticket listesiyle (M2.5).
3. Poker sonrası işi kimin alacağına karar veren **gönüllü + mini oyun** akışı (M3).

### Bu sürümde YOK (yapma)
Retro, rapor/PDF dışa aktarım, hesap/giriş, ödeme, Jira/Slack entegrasyonu, kalıcı takım alanı, veritabanı, mobil uygulama. Bunlar sonraki aşamada. Ama kodu, ileride eklenmelerini zorlaştırmayacak şekilde düzenle (özellikle durum saklama arayüzü, bkz. 5).

## 2. Kullanıcı rolleri

| Rol | Yetki |
|---|---|
| **Moderatör** (arayüzde **Krupiye**, M2.5) | Odayı açan kişi. Ticket girer/değiştirir, kartları açar, tekrar oylama başlatır, final tahmini onaylar, atama oyununu başlatır, başka birini moderatör yapabilir, oturumdaki kişileri masadan atabilir (M3). |
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

> M2.5 ile proje sahibinin isteği üzerine güncellendi: ilk yön "sakin, kahve tonları, casino hissi yok" idi; yeni yön **eğlenceli poker masası**.

- Ton: eğlenceli, sıcak, oyunlu. Poker masası benzetmesi bilerek kullanılır (yeşil çuha, krupiye, iskambil kartları). Ama **para/bahis yok**: fiş üstünde para değeri, rulet, slot makinesi, neon ışık yok. Kumar değil, masa oyunu hissi.
- Masa: yeşil çuha yüzey (hafif doku ve ortadan aydınlanan degrade), koyu ahşap ya da bordo deri kenar (rail), ince altın detaylar. Oval/yuvarlak. Katılımcılar masanın etrafında avatar ve isimleriyle oturur.
- Kartlar: gerçek iskambil kağıdı gibi. Değer ve küçük bir sembol sol üst ve sağ alt köşede (sağ alttaki ters), ortada uygulamanın logosu, desenli arka yüz. `?` = **Joker**, `☕` = **Mola** kartı. Elde yan yana dizilir, sığmazsa alt satıra geçer (kaydırma yok), seçilen kart yukarı kalkar, açılırken çevrilir (flip).
- Açık ve koyu tema (sistem tercihine uyar, elle değiştirilebilir). İkisinde de masa yeşil kalır; değişen zemin ve paneller.
- Animasyonlar `prefers-reduced-motion` ayarına saygı gösterir. Sesler varsayılan **kapalı**, tek tuşla açılır.
- Mobil tarayıcıda kullanılabilir olmalı: dar ekranda masa yerine yarım daire/liste yerleşimi, kart eli satırlara bölünür.
- Avatarlar: insan gibi görünen, karakterli (şapka, gözlük, bıyık vb. seçilebilir) avatarlar; lisansı uygun olmalı (lisansı Varsayımlar'a yaz). Seçim ekranında birkaç rastgele öneri + yenile butonu + elle özelleştirme.

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
- **Ticket:** (M2.5 ile **isteğe bağlı**, varsayılan kapalı; bkz. 6.5) Moderatör bir başlık (zorunlu) ve opsiyonel link/not girer. Çoklu ticket kuyruğu: ekle, sırala, sil, sıradakine geç. Ticket'ları toplu yapıştırarak (satır başına bir ticket) ekleme desteği.
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

## 6.5 M2.5 — Poker masası teması ve isteğe bağlı ticket

**Amaç:** Uygulamayı daha eğlenceli hale getirmek (proje sahibinin M2 denemesinden sonraki geri bildirimi) ve ticket listesini zorunlu olmaktan çıkarmak. Yeni oyun mantığı yok; poker kuralları ve gizlilik M2'deki gibi kalır.

### A. Ticket listesi isteğe bağlı
- Odanın `ticketsEnabled` ayarı, **varsayılan kapalı**. Oda açılırken ("Ticket listesi kullan" kutusu) ve odada krupiye ayarlarından açılıp kapatılır. Durum `room.state` içinde herkese gider.
- Kapalıyken ticket paneli görünmez, masa ekranı ortalanır. Oylama "serbest tur" olarak işler: oy ver, aç, tekrar oyla, final.
- Kapalıyken krupiye masanın ortasına isteğe bağlı kısa bir **konu** yazabilir ("Ne oylanıyor?", en fazla 120 karakter). Konu ve final değeri **oturum geçmişine** yazılır (odadaki son 20 serbest tur, tur geçmişiyle birlikte).
- Kapalıyken `ticket.*` niyetleri `FEATURE_DISABLED` hatası döner.
- Kapatınca mevcut ticket'lar silinmez, gizlenir; tekrar açınca geri gelir. Masadaki ticket varsa açık tur geçmişe yazılır ve yeni serbest tur başlar.
- M2'deki "final tahmin bir ticket gerektirir" kuralı kalkar: ticket kapalıyken final tura (ve oturum geçmişine) yazılır.
- M3'teki "Kim alacak?" adımı ticket kapalıyken masadaki tur (konusu) için çalışır.
- Ölçüm: ticket özelliği açılan oda sayısı (`ticketsEnabledRooms`). Konu metni yazılmaz.

### B. Poker masası teması
- Kahve/ahşap paleti kaldırılır. Yeşil çuha masa, koyu ahşap ya da bordo deri kenar, altın vurgu rengi.
- Açık tema: açık zemin, yeşil masa. Koyu tema: koyu yeşil-siyah zemin, aynı masa.
- Tüm metinlerde kontrast WCAG AA (4.5:1) korunur. Altın renk yalnızca vurgu için, okunması gereken küçük metin için kullanılmaz.

### C. İskambil kartları
- Ön yüz: değer + küçük sembol sol üst ve sağ alt köşede (sağ alttaki 180° döner), ortada logo. Sembol (♠ ♥ ♦ ♣) deste sırasına göre dönüşümlü verilir; ♥ ♦ kırmızı.
- `?` kartı **Joker** (şapkalı joker çizimi), `☕` kartı **Mola** (fincan çizimi). İkisi M2'deki gibi sayıma girmez.
- Arka yüz: desenli (logo tekrarlı ya da çizgili), masadaki kapalı kartlar bu yüzle görünür.
- 390 px genişlikte köşe değerleri okunur kalır; gerekirse kartlar biraz büyür. T-shirt ve özel destelerde de (8 karaktere kadar) köşe yazısı sığar.
- Logo: basit bir SVG amblem (ürün adı değişirse güncellenir). Sayfa başlığında ve favicon'da da kullanılır.

### D. Karakter avatarları
- Mevcut "uzaylı gibi" avatar yerine daha insan gibi bir taban ve üstüne **seçilebilir aksesuarlar**: şapka (kovboy, dedektif/fötr, silindir, krupiye vizörü), gözlük (normal, güneş, monokl), bıyık/sakal, kıyafet rengi.
- Seçim ekranı: rastgele öneriler + yenile + her aksesuar için önceki/sonraki seçimi.
- Avatar sunucuda yine kısa, doğrulanmış bir metin olarak saklanır (taban tohumu + aksesuar kodları); görsel tarayıcıda üretilir. Bilinmeyen kod reddedilir.
- Lisans: taban stil CC0 ya da benzeri serbest lisans; aksesuarlar bizim çizdiğimiz SVG'ler. Karar Varsayımlar'a yazılır.

### E. Krupiye
- Arayüzde "Moderatör" yerine **"Krupiye"** (kod ve olay adlarında `moderator` kalır). Devir mesajları da buna göre ("Krupiye artık Ayşe").
- Krupiyenin koltuğunda poker masasındaki gibi **"D" (dealer) düğmesi** ve avatarında yelek/papyon.
- Yeni turda kartlar krupiyeden ellere **dağıtılır** (kısa animasyon); "Kartları aç" anında krupiyeden masaya doğru küçük bir hareket. `prefers-reduced-motion` açıksa yok.

### F. Eğlenceli dokunuşlar (proje sahibinin onayına göre)
1. Herkes aynı kartı seçtiyse açılışta konfeti ve "Royal Flush!" yazısı.
2. Oyların çoğu `☕` ise "Mola zamanı?" önerisi.
3. Krupiye oy vermeyenleri "dürt"ebilir (koltuklarında kısa titreşim; kişi başına 30 sn'de bir).
4. Masaya emoji fırlatma (👍 🎉 🤔 vb., kişi başına hız sınırlı).
5. Kart karıştırma ve fiş sesleri (ses yine varsayılan kapalı).

### Kabul kriterleri
- Yeni odada ticket paneli yok; serbest turda oy ver → aç → final çalışır, oturum geçmişinde görünür (uçtan uca test).
- Krupiye ticket listesini açınca panel gelir, kapatınca ticket'lar korunur; kapalıyken `ticket.*` niyetleri reddedilir (otomatik test).
- M2'nin tüm sızıntı testleri ve uçtan uca testleri geçmeye devam eder.
- Kart köşeleri masaüstünde ve 390 px'te okunur; Joker ve Mola kartları ayırt edilir; açılış aynı anda çevrilir.
- Açık ve koyu temada ekran görüntüleriyle kontrol; metin kontrastı AA.
- Avatar seçiminde aksesuarlar önizlenir, geçersiz avatar dizesi sunucuda reddedilir (otomatik test).
- Animasyonlar ve konfeti `prefers-reduced-motion` açıkken çalışmaz.

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

### Masadan atma (moderatör yetkisi)
- Moderatör (krupiye), oturuma katılan herhangi bir kişiyi (katılımcı veya gözlemci) masadan **atabilir**. Kendini atamaz. Koltuk menüsünde ve izleyiciler listesinde "Masadan at" seçeneği çıkar; yanlışlıkla basılmasın diye onay sorulur.
- Yetki kontrolü sunucuda yapılır: moderatör olmayan birinin atma isteği reddedilir.
- Atılan kişinin oturum token'ı geçersiz olur, bağlantısı kapanır ve ekranında "Krupiye seni masadan çıkardı" mesajı görünür. Odadaki herkes "X masadan çıkarıldı" bildirimini görür.
- Atılan kişinin açılmamış oyu turdan silinir. Aday listesindeyse veya gönüllüyse oradan da çıkarılır. Daha önce yapılmış atamalar ve geçmiş değişmez.
- Atılan kişi oda linkiyle yeniden katılabilir (kalıcı engelleme bu milestone'da yok). Atılan kişi moderatörse ve başka moderatör kalmazsa M1'deki devretme kuralı uygulanır.

### Kabul kriterleri
- Moderatör bir kişiyi attığında o kişinin bağlantısı kapanır, eski token'ı ile yeniden bağlanamaz ve masadan/aday listesinden kalkar. Moderatör olmayanın atma isteği reddedilir (otomatik testler).
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

1. M1'i bitir, çalıştır, test et, kısa özet ver ve **dur**. Onay gelmeden M2'ye geçme. Aynısı M2 → M2.5 ve M2.5 → M3 için.
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
- **Avatar kütüphanesi:** DiceBear (`@dicebear/core` + `@dicebear/lorelei`, kod lisansı MIT). "Lorelei" stilinin tasarımı Lisa Wischofsky'ye ait, **CC0 1.0** (kamu malı), atıf zorunlu değil. Sunucu yalnızca avatar tohumunu (`[A-Za-z0-9_-]{1,32}`) saklar; görsel tarayıcıda üretilir. (M2.5: DiceBear kaldırıldı, kendi SVG karakterlerimiz; bkz. M2.5.)
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
- **İstatistik (bölüm 8):** M1'de yalnızca oda sayısı ve en yüksek eşzamanlı katılımcı sayacı vardı; M2'de diğer sayaçlar eklendi (aşağıda). Günlük dosyaya yazma henüz yok, sadece bellek + `/admin/stats`.
- **Masa görünümü M1'de geldi:** Lobi zaten oval masa etrafında oturma düzeniyle çizildi (M2'de kartlar bunun üstüne eklenecek). 8/14/24 kişi eşiklerinde avatarlar küçülüyor, 16 kişiden sonra iki sıra; 640 px altında masa üstte, koltuklar ızgarada.
- **Sesler:** M1'de ses yoktu; düğme M2'de geldi (aşağıda).
- **Barındırma:** Tek Docker imajı, tek kopya. Durum bellekte olduğu için yatay ölçekleme yok.

### M2

- **Gizlilik nasıl sağlanıyor:** Oylar sunucuda `PokerRound` içinde `Map<participantId, Vote>`. İstemciye giden `RoundView`, tur `VOTING` iken yalnızca `votedIds` taşır; `votes` ve `stats` alanları JSON'a hiç yazılmaz (`@JsonInclude(NON_NULL)`, uygulama ayarından bağımsız). Kişinin kendi oyu yalnızca `/user/queue/room` ile ona gider (`poker.your_vote`, yeniden bağlanınca `room.state_snapshot.yourVote`). Birim testi (`PokerServiceTest#unrevealedVotesNeverLeak`) ve 4 gerçek STOMP istemcili entegrasyon testi (`RoomWebSocketIntegrationTest#fourClientsVoteAndNoVoteLeaksBeforeReveal`) her istemcinin aldığı tüm mesajları tarar. Uçtan uca testte de tarayıcının aldığı WebSocket çerçeveleri kontrol ediliyor.
- **Tur kimliği:** Her yeni tur (tekrar oylama, ticket değişimi, deste değişimi) yeni bir `round.id` alır. İstemci kendi oyunu bu kimlikle eşleştirir; eski turun oyu yeni turda yanlışlıkla seçili görünmez.
- **İstatistik:** Ortalama ve medyan yalnızca sayıya çevrilebilen kartlardan (`½`, `0.5`, `0,5`, `1/2` = 0.5). Mod, en düşük/en yüksek ve uzlaşı `?`/`☕` dışındaki tüm kartlarla, **deste sırasına** göre (T-shirt destesinde de çalışsın diye). Mod eşitliğinde hepsi gösterilir. Tek kişi oy verdiyse en düşük/en yüksek vurgusu yapılmaz.
- **Uzlaşı göstergesi:** "Herkes aynı" = tek kart; "Yakın" = destede yan yana iki kart (aradaki `?`/`☕` sayılmaz); "Dağınık" = daha geniş. Sayılabilir oy yoksa "Sayılabilir oy yok".
- **Final önerisi:** Medyana en yakın sayısal kart; eşitlikte büyük olan (iyimser tahmin vermemek için). Sayısal oy yoksa (T-shirt) deste sırasında ortadaki oy. Final `?`/`☕` olamaz ve destede olmalı.
- **Final tahmin bir ticket gerektirir** (M2.5'te değişiyor, bkz. 6.5): Ticket olmadan da oylanabilir ("Serbest tur"), ama final ancak masadaki ticket'a yazılır.
- **Tur geçmişi:** Açılmış her tur, tur bitince (tekrar oylama, başka ticket, deste değişimi, final) o ticket'ın geçmişine yazılır. Ticket başına en fazla 20 tur saklanır. Açılmadan geçilen turun oyları atılır (hiç açılmadığı için kimse görmedi).
- **Oy verip ayrılan:** Oy anındaki isim/avatar oyla birlikte saklanır, açılışta "odadan ayrıldı" notuyla görünür ve sayılır. Moderatör sonuç panelindeki "Sayıma dahil edilenler" listesinden herhangi bir oyu (ayrılan ya da değil) sayımdan çıkarabilir.
- **Deste değişimi:** Turun oyları sıfırlanır (yeni tur kimliği), herkese `poker.deck_changed` ile bildirim (toast) gider. Tur açılmışsa önce geçmişe yazılır. Özel deste oda boyunca saklanır; hazır desteye geçip geri dönülebilir. Özel destede tekrar kontrolü büyük/küçük harf duyarsız ("xl" ve "XL" aynı sayılır).
- **Ticket kuyruğu:** Başlık 1-120 karakter, link yalnızca `http(s)://` (arayüzde `javascript:` vb. link oluşamaz), not en fazla 500 karakter, oda başına en fazla 100 ticket. Toplu yapıştırmada her satır bir ticket; satırdaki link ticket'ın linki olur. Biri geçersizse hiçbiri eklenmez. Sıralama yukarı/aşağı düğmeleriyle (sürükle-bırak yok, bağımlılık eklememek ve klavyeyle de çalışması için). Masa boşken ticket eklenirse ilki masaya gelir. "Sıradaki ticket" tahmin edilmemiş bir sonrakine geçer.
- **Zamanlayıcı:** Hazır süreler 1, 2, 5 dk (sunucu 10 sn-60 dk kabul eder). Sunucu kalan süreyi gönderir, istemci kendi saatiyle sayar (cihaz saatleri farklı olsa da herkeste aynı). Süre bitince masadaki sayaç yavaşça "nefes alır" (kırmızı alarm yok); ses açıksa yumuşak üç nota.
- **Ses:** Başlıktaki "Ses" düğmesi, varsayılan kapalı, tercih tarayıcıda saklanır. Ses dosyası yok; Web Audio ile kısa sinüs tonları (kartlar açılınca ve süre bitince).
- **Klavye:** ←/→ kart işaretler, sayı tuşları doğrudan karta gider ("1" sonra "3" = 13; `.` ya da `,` = ½), Enter onaylar, Esc oyu geri çeker. Yazı alanındayken devre dışı.
- **Oy değiştirme:** Seçili karta tekrar tıklamak oyu geri çeker, başka karta tıklamak değiştirir. Açılınca el kilitlenir.
- **Gözlemci geçişi:** Kişi kendisi ya da moderatör yapar. Açık turda oy vermiş biri izleyiciye geçemez (önce oyunu geri almalı); böylece "oyu sayılır mı" belirsizliği olmaz.
- **"Aç" vurgusu:** Bağlı (çevrimiçi) tüm katılımcılar oy verdiyse düğme vurgulanır; çevrimdışı koltuklar beklenmez. Açmak her zaman serbest.
- **Kart çevirme:** Tüm kartlar aynı `room.state` mesajıyla açıldığı için aynı karede çevrilir. `prefers-reduced-motion` açıksa animasyon anında biter.
- **Kart eli (proje sahibinin geri bildirimiyle):** Kaydırma yok. Kartlar yan yana dizilir, sığmazsa alt satıra geçer (dökümandaki "yelpaze" ve "alt çubukta kaydırma" yerine). El masanın altında sabit durur, ekrana yapışmaz; böylece masadaki koltukları örtmez. Seçilen kart yukarı kalkar. Masaüstünde 13 kartlık deste tek satıra sığar.
- **Mobil:** 640 px altında masa üstte, koltuklar ızgarada; kart eli satırlara bölünür. 390 px genişlikte uçtan uca test var (kart elinde kaydırma olmadığı da test ediliyor).
- **Toast'lar:** Kart eliyle çakışmasın diye ekranın üstüne taşındı.
- **Ölçüm (bölüm 8):** Yeni sayaçlar: açılan poker turu (`pokerRoundsRevealed`), final onaylanan ticket (`ticketsFinalized`), atama oyunu (`assignmentGamesStarted`, oyun tipine göre; M3'te dolacak), ortalama oturum süresi (`averageSessionMinutes`: odada ilk bağlantıdan son bağlantı hareketine kadar). Oy değeri, isim ya da başlık yazılmaz.
- **Hata işleme:** STOMP hata işleyicisi tüm denetleyiciler için ortak (`SocketErrorAdvice`); poker niyetleri ayrı denetleyicide (`PokerSocketController`).
- **M1 düzeltmesi:** `/yeni` adresi doğrudan açılınca (ya da sayfa yenilenince) 404 veriyordu; artık uygulamaya yönleniyor. Koltuklar M1'de framer-motion'ın `transform`'u yüzünden tam ortalanmıyordu; konum ve animasyon ayrı öğelere alındı.

### M2.5

- **Ticket listesi isteğe bağlı:** `Room.ticketsEnabled`, varsayılan kapalı. Oda açılırken "Ticket listesi kullan" kutusu, odada krupiye ayarlarından aç/kapa (`room.set_tickets_enabled`). Kapalıyken `room.state.tickets` boş gider (ticket'lar sunucuda durur), tüm `ticket.*` niyetleri `FEATURE_DISABLED` döner. Kapatırken masada ticket varsa açılmış tur o ticket'ın geçmişine yazılır, yeni serbest tur başlar. Tekrar açınca masa boşsa sıradaki tahmin edilmemiş ticket masaya gelir (M2'deki "ilk ticket masaya gelir" davranışıyla aynı).
- **Serbest tur ve konu:** Konu turun bir alanı (`round.topic`, en fazla 120 karakter, boş olabilir). Tekrar oylama ve deste değişiminde konu korunur; ticket'sız tur finallenip yeni tur başlayınca konu temizlenir ve tur numarası 1'e döner. Masada ticket varken konu yazılamaz (`WRONG_PHASE`).
- **Oturum geçmişi:** Açılmış her serbest tur, tur bitince konusu, oyları, istatistiği ve (varsa) finaliyle `room.sessionHistory`'ye yazılır. Odada son 20 tur. Açılmadan geçilen tur yazılmaz (M2'deki ticket geçmişi kuralıyla aynı).
- **Final ticket gerektirmez:** M2 kuralı kalktı. Masada ticket varsa ticket `ESTIMATED` olur, yoksa final tura ve oturum geçmişine yazılır. `ticketsFinalized` sayacı her finalde artar (ticket'sız olanlar dahil).
- **Ölçüm:** `ticketsEnabledRooms`: ticket listesini en az bir kez açan oda sayısı (oda açılırken ya da sonradan). Konu metni hiçbir yere yazılmaz.
- **Tema:** Kahve paleti kaldırıldı. Açık tema: açık krem zemin; koyu tema: koyu yeşil-siyah zemin; masa (çuha `#1c6b46`, ahşap kenar `#5b2e1d`, altın çizgi `#c9a24a`) ikisinde aynı. Birincil düğmeler çuha yeşili. Altın yalnızca süs ve kenar için; okunan metinlerde yok. Kontrast kontrol edildi: masadaki metin en aydınlık çuha tonunda 4,76:1, ikincil metin zeminde 5,98:1 (açık) / 8,58:1 (koyu), kart üstündeki kırmızı 6,53:1.
- **İskambil kartları:** Kendi SVG/CSS çizimimiz. Sembol deste sırasına göre ♠ ♥ ♦ ♣ dönüşümlü; ♥ ♦ kırmızı. Ortada amblem. 4+ karakterli değerlerde köşe yazısı küçülür ve değer ortada da yazılır (amblemin yerine), böylece 8 karakterlik özel kartlar da okunur. `?` = Joker (şapkalı joker çizimi, köşede ★J), `☕` = Mola (fincan). Arka yüz bordo zemin + altın kafes + amblem. Masadaki kartlar M2'den biraz büyük (42×60 px), eldeki kartlar 54×78 (mobilde 56×80).
- **Logo:** Yeşil çuha dairesi, altın halka, iki kart ve maça. Başlıkta (`components/brand/Logo.tsx`) ve `public/favicon.svg`'de aynı çizim.
- **Avatarlar:** DiceBear/Lorelei kaldırıldı. Karakterler tamamen bizim çizdiğimiz SVG (`lib/avatar.ts`), dolayısıyla lisans sorunu yok (projenin kendi lisansı). Avatar metni `tohum` ya da `tohum.HGBK`: tohum yüzü (ten, saç modeli/rengi, göz, ağız, zemin) belirler, kodlar aksesuarları (şapka: kovboy/fötr/silindir/krupiye vizörü; gözlük: gözlük/güneş/monokl; bıyık/sakal: bıyık/sakal/keçi sakalı; 8 kıyafet rengi). Sunucu düzenli ifadeyle doğrular, bilinmeyen kod `INVALID_AVATAR`. Eski (yalnız tohum) avatarlar geçerli kalır; aksesuarsız, kıyafet rengi tohumdan çizilir. Seçim ekranında 6 rastgele öneri, "Başka öneriler", "Başka yüz" ve her aksesuar için ‹ › düğmeleri.
- **Krupiye:** Arayüzde "Moderatör" yerine "Krupiye" (kodda `moderator`). Krupiyenin koltuğunda "D" düğmesi, avatarında bordo yelek ve papyon. Krupiye değişince herkese "Krupiye artık Ayşe" bildirimi. Yeni turda kartlar krupiye koltuğundan diğer koltuklara uçar ve eldeki kartlar sırayla dağıtılır; "Kartları aç" anında krupiyeden masanın ortasına üç kart kayar. Mobil ızgarada koltuk konumu olmadığı için masa üstü efektleri yok (el dağıtımı var). "Hareketi azalt" açıksa hiçbiri yok.
- **Royal Flush:** En az iki oy ve hepsi aynı sayılabilir kart (`?`/`☕` değil). Açılışta konfeti + büyük yazı (≈3 sn), ses açıksa kısa arpej; sonuç panelinde kalıcı "Royal Flush! Herkes aynı kartı seçti." yazısı. "Hareketi azalt" açıkken konfeti/yazı animasyonu yok, paneldeki yazı var.
- **Mola önerisi:** Sayılan oyların yarısından fazlası `☕` ise sonuç panelinde "Mola zamanı? ☕". Yalnızca öneri; bir şey değişmez.
- **Dürtme:** Krupiye, oy vermemiş bağlı bir katılımcının koltuk menüsünden "Dürt" ya da tur düğmelerinden "Bekleyenleri dürt" (en az bir oy verilmişse görünür). Sunucu kişi başına 30 sn'de bir izin verir (`RATE_LIMITED`); arayüz de aynı süreyi hatırlar. Koltuk kısa titrer, dürtülen kişiye bildirim ve (ses açıksa) "tık tık".
- **Emoji:** Kart elinin altında 8 emoji (👍 🎉 🤔 😂 😮 👏 🔥 ☕), izleyiciler dahil herkes. Sunucuda izinli liste ve kişi başına 10 sn'de 5 sınır; saklanmaz, yalnızca `table.emoji` olayı. Emoji gönderenin koltuğundan masanın ortasına uçup kaybolur.
- **Sesler:** Ses dosyası yok, Web Audio. Yeni tur: kart karıştırma (kısa gürültü patlamaları); oy verince: fiş; açılış: iki fiş + iki nota; dürtme; emoji: küçük "pop"; Royal Flush: arpej. Varsayılan kapalı (M2'deki düğme).
- **DiceBear bağımlılıkları** (`@dicebear/core`, `@dicebear/lorelei`) package.json'dan çıkarıldı.
