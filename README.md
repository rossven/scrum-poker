# SprintMasası

Ekibin sprint planlamada kullandığı, hesapsız ve ücretsiz bir planning poker aracı.
Linkle girilen oda, avatarlı poker masası, planning poker ve işi kimin alacağını belirleyen "Kim alacak?" akışı.

Durum: **M1 (iskelet ve oda)**, **M2 (planning poker masası)**, **M2.5 (poker masası teması, isteğe bağlı ticket)** ve **M3 ("Kim alacak?": gönüllü + at yarışı / şans çarkı, masadan atma, koltuk devralma)** tamam.

## Hızlı başlangıç

### Docker ile (tek komut)

```bash
docker compose up --build
```

Sonra http://localhost:8080 adresini aç.

### Geliştirme

Gerekenler: Java 21, Node 20+ (Gradle wrapper repoda, ayrıca Gradle kurmaya gerek yok).

```bash
# 1. terminal: backend (http://localhost:8080)
cd backend && ./gradlew bootRun

# 2. terminal: frontend, anlık yenilemeli (http://localhost:5173)
cd frontend && npm install && npm run dev
```

Vite, `/api` ve `/ws` isteklerini 8080'e yönlendirir. Aynı odayı farklı kullanıcılar gibi denemek için
ikinci pencereyi gizli pencere ya da başka bir tarayıcı olarak aç (oturum token'ı tarayıcıda saklanır).

### Tek JAR

```bash
cd frontend && npm ci && npm run build
cd ../backend && ./gradlew bootJar
java -jar build/libs/sprintmasasi-0.1.0.jar
```

`bootJar`, `frontend/dist` varsa onu JAR'ın içine gömer.

## Testler

```bash
cd backend && ./gradlew test          # birim + WebSocket entegrasyon (30 sahte istemci, 4 istemcili oy sızıntı testi, 10.000 denemelik oyun adaleti dahil)

# uçtan uca (uygulama 8080'de çalışırken)
cd e2e && npm install && npx playwright install chromium && npm test
```

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | `8080` | HTTP portu |
| `SM_MAX_PARTICIPANTS` | `100` | Oda başına koltuk tavanı (güvenlik sınırı) |
| `SM_IDLE_EXPIRY_DAYS` | `7` | Hareketsiz oda temizliği |
| `SM_MODERATOR_GRACE_SECONDS` | `20` | Moderatör kopunca devirden önce bekleme |
| `SM_ALLOWED_ORIGINS` | boş | Virgülle ayrılmış izinli origin'ler. Boşsa yalnızca aynı origin (önerilen: frontend ve backend aynı adreste). |
| `SM_PASSWORD_MAX_ATTEMPTS` | `5` | IP + oda başına yanlış şifre sınırı |
| `SM_PASSWORD_WINDOW_SECONDS` | `300` | Yanlış şifre sayacının penceresi |
| `SM_CREATE_ROOMS_PER_MINUTE` | `10` | IP başına oda oluşturma sınırı |
| `SM_MESSAGES_PER_SECOND` | `20` | Katılımcı başına WebSocket mesaj sınırı |
| `SM_ADMIN_TOKEN` | boş | Tanımlıysa `GET /admin/stats` bu token ile açılır (`Authorization: Bearer ...`) |

Ters vekil (nginx, Caddy, PaaS) arkasında çalışırken gerçek istemci IP'si için
`SERVER_FORWARD_HEADERS_STRATEGY=native` ekle; vekilin WebSocket yükseltmesini (`Upgrade` başlığı) geçirdiğinden emin ol.

## Dağıtım

Tek servis, veritabanı yok. Küçük bir VPS veya Docker çalıştıran herhangi bir PaaS yeterli:

```bash
docker build -t sprintmasasi .
docker run -p 8080:8080 -e SM_ADMIN_TOKEN=... sprintmasasi
```

Oda durumu bellekte tutulur; sunucu yeniden başlarsa açık odalar kaybolur (bu sürümde kabul edildi),
istemci "Oda bulunamadı, yeni oda aç" mesajı gösterir. Bu yüzden **tek kopya** çalıştır (yatay ölçekleme yok).

## Mimari özet

```
frontend/  React + TypeScript (Vite), Zustand, Framer Motion, react-i18next, CSS Modules
backend/   Java 21, Spring Boot 3.5, STOMP WebSocket, Gradle
docs/      events.md: olay ve API şemaları
e2e/       Playwright senaryoları
```

- **Sunucu otoriter.** İstemci niyet gönderir (`/app/room.promote` vb.), `RoomService` yetkiyi ve kuralları
  kontrol eder, sonra `room.state` yayınlar.
- **Oda başına kilit.** Her `Room` kendi `ReentrantLock`'ı altında değişir; yarış durumları oda içinde sıralanır.
- **`RoomRepository` arayüzü.** Şimdilik `InMemoryRoomRepository`; kalıcı depo eklemek bu arayüzü uygulamaktan ibaret.
- **Kimlik.** Hesap yok. Katılınca rastgele bir token verilir, tarayıcıda (`localStorage`) saklanır;
  WebSocket CONNECT'te bu token ile koltuk doğrulanır. Sayfa yenilenince aynı koltuğa dönülür.
- **Şifre.** BCrypt ile hash'lenir; açık metin saklanmaz, loglanmaz, hiçbir yanıtta yer almaz.
- **Gizlilik.** Loglara yalnızca oda kodu ve olay tipi yazılır. İstatistikler isim/avatar/başlık içermez.
- **Açılmamış oylar.** Oylar yalnızca sunucuda tutulur. Kartlar açılana kadar odaya sadece kimlerin oy verdiği
  yayınlanır; oy değeri yalnızca oy verene kişisel kuyruktan gider (`RoomService#roundView`).
  `PokerServiceTest#unrevealedVotesNeverLeak` ve `RoomWebSocketIntegrationTest#fourClientsVoteAndNoVoteLeaksBeforeReveal`
  bunu doğrular; bu testlerin geçmesi birleştirme koşuludur.
- **Tema ve görseller (M2.5).** Yeşil çuha masa, ahşap kenar, altın detay. İskambil kartları, logo ve karakter
  avatarları bizim çizdiğimiz SVG'ler (`components/poker/CardFace.tsx`, `components/brand/Logo.tsx`, `lib/avatar.ts`);
  dış görsel kütüphanesi ya da lisanslı varlık yok. Sesler Web Audio ile üretilir, varsayılan kapalı.
- **"Kim alacak?" adaleti (M3).** Kazananı ve tam sıralamayı yalnızca sunucu `SecureRandom` ile çeker
  (`games/WeightedDraw`). Oyunlar (`TieBreakerGame`) sıralamaya uygun animasyon parametreleri üretir; istemci yalnızca
  bunları çizer, sonuç belirlemede `Math.random` kullanmaz (yalnızca konfeti ve ses gibi süslerde var).
  Yeni oyun eklemek: `TieBreakerGame`'i uygulayan bir `@Component` + `frontend/src/components/assign` altında bir bileşen.
- **Çeviri.** Tüm arayüz metinleri `frontend/src/i18n/locales/tr.json` içinde. Yeni dil için `en.json` ekleyip
  `i18n/index.ts`'e kaydetmek yeterli.

Önemli sınıflar: `room/RoomService` (oda kuralları, masadan atma, koltuk devralma), `room/AssignmentService` ("Kim alacak?"), `games/TieBreakerGame` (oyun arayüzü; `HorseRaceGame`, `WheelGame`), `room/PokerService` (oylama, ticket, serbest tur, deste, zamanlayıcı, dürtme, emoji),
`poker/VoteStatistics` (istatistik, saf hesap), `poker/Deck` (desteler, kart → sayı), `room/Room` (durum + kilit), `ws/StompAuthInterceptor`
(CONNECT/SUBSCRIBE güvenliği), `ws/StompRoomEvents` (yayın), `frontend/src/store/roomStore.ts` (istemci durumu),
`frontend/src/api/socket.ts` (yeniden bağlanan STOMP istemcisi).
