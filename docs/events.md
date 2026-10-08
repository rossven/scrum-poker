# Olaylar ve API (v1)

Sunucu otoriterdir: istemci yalnızca **niyet** gönderir, sunucu doğrular ve durumu yayınlar.
Her sunucu mesajı aynı zarfla gelir:

```json
{ "type": "room.state", "v": 1, "data": { ... } }
```

`v` olay şeması sürümüdür; kırıcı bir değişiklikte artar. Yeni alan eklemek kırıcı sayılmaz,
istemciler bilmedikleri alanları yok saymalıdır.

Hiçbir mesajda token, şifre veya şifre hash'i bulunmaz.

Arayüzde moderatör **"Krupiye"** olarak geçer (M2.5); kodda ve olay adlarında `moderator` kalır.

## REST

| Yöntem | Yol | Gövde | Yanıt |
|---|---|---|---|
| `POST` | `/api/rooms` | `{ name?, deck?, customDeck?, password?, ticketsEnabled?, autoReveal? }` | `201 { code, claimToken }` |
| `GET` | `/api/rooms/{code}` | | `{ code, name?, passwordProtected }` |
| `POST` | `/api/rooms/{code}/join` | `{ nickname, avatar, observer, password?, token?, claimToken?, takeover? }` | `{ code, participantId, token, nickname, rejoined, takenOver }` |
| `GET` | `/admin/stats` | `Authorization: Bearer <SM_ADMIN_TOKEN>` | sayaçlar (JSON) |

- `deck`: `modified-fibonacci` (varsayılan), `fibonacci`, `tshirt`, `custom`.
- `customDeck`: `deck = custom` ise kart listesi. En fazla 20 kart, kart başına en fazla 8 karakter, tekrar yok (büyük/küçük harf duyarsız), virgül ve kontrol karakteri yok. Kurala uymazsa `INVALID_DECK`.
- `ticketsEnabled`: ticket listesi açık mı başlasın (varsayılan `false`, M2.5). Krupiye odada sonradan açıp kapatabilir.
- `autoReveal`: "Otomatik aç" oda ayarı açık mı başlasın (varsayılan `false`). Krupiye odada sonradan değiştirebilir.
- `claimToken`: oda oluşturunca dönen tek kullanımlık anahtar. Katılırken gönderen kişi moderatör olur.
- `token`: daha önce alınmış oturum token'ı. Geçerliyse aynı koltuğa dönülür, şifre sorulmaz (`rejoined: true`).
- `takeover` (M3): odada aynı isimde (büyük/küçük harf duyarsız) **çevrimdışı** bir koltuk varsa ve alan yoksa sunucu `409 SEAT_TAKEOVER` döner; istemci "Bu koltuk senin mi?" diye sorar. `true`: koltuk devralınır (isim, avatar, bu turdaki oy, gönüllülük korunur; yeni token verilir, eski token geçersiz olur; **krupiyelik geçmez**, başka krupiye kalmazsa M1 devretme kuralı işler), yanıtta `takenOver: true`. `false`: yeni koltuk ("Ayşe 2"). Çevrimiçi koltuk devralınamaz, soru da sorulmaz. Şifreli odada şifre yine gerekir.
- `nickname`: 1-24 karakter, kontrol karakteri yok. Odada aynısı varsa sonuna numara eklenir (`"Ayşe 2"`); yanıttaki `nickname` geçerli olandır.
- `avatar`: `tohum` ya da `tohum.HGBK` (M2.5). Tohum `[A-Za-z0-9_-]{1,32}`, yüzü belirler. Kodlar: `H` şapka 0-4 (yok, kovboy, fötr, silindir, krupiye vizörü), `G` gözlük 0-3 (yok, gözlük, güneş, monokl), `B` bıyık/sakal 0-3 (yok, bıyık, sakal, keçi sakalı), `K` kıyafet rengi 0-7. Görsel tarayıcıda çizilir; bilinmeyen kod `INVALID_AVATAR`.

Hata yanıtı: `{ "error": "KOD" }`

| Kod | HTTP | Anlamı |
|---|---|---|
| `ROOM_NOT_FOUND` | 404 | Oda yok, kapatıldı ya da sunucu yeniden başladı |
| `INVALID_INPUT` / `INVALID_NICKNAME` / `INVALID_AVATAR` / `INVALID_PASSWORD` | 400 | Geçersiz girdi |
| `INVALID_DECK` | 400 | Özel deste kurallara uymuyor |
| `INVALID_TICKET` | 400 | Ticket başlığı 1-120 karakter değil, link http(s) değil, not 500 karakterden uzun |
| `PASSWORD_REQUIRED` / `WRONG_PASSWORD` | 401 | Şifreli oda |
| `INVALID_TOKEN` | 401 | Oturum token'ı tanınmıyor |
| `FORBIDDEN` | 403 | Yetki yok (ör. moderatör olmayan) |
| `ROOM_FULL` | 409 | Güvenlik tavanı (`SM_MAX_PARTICIPANTS`) doldu |
| `WRONG_PHASE` | 409 | Tur bu niyet için uygun durumda değil (ör. açılmış turda oy) |
| `ALREADY_VOTED` | 409 | Açık turda oy vermiş kişi izleyiciye geçemez |
| `TICKET_LIMIT` | 409 | Odada en fazla 100 ticket |
| `FEATURE_DISABLED` | 409 | Özellik bu odada kapalı (ticket listesi kapalıyken `ticket.*`) |
| `NO_VOTES` | 409 | Hiç oy yokken `poker.reveal` |
| `SEAT_TAKEOVER` | 409 | Aynı isimde çevrimdışı koltuk var; `takeover` ile yeniden gönder |
| `KICKED` | 403 | Krupiye bu kişiyi masadan attı; eski token'la bağlanılamaz (STOMP `ERROR` mesajı) |
| `TOO_MANY_ATTEMPTS` | 429 | IP + oda başına yanlış şifre sınırı |
| `RATE_LIMITED` | 429 | Hız sınırı |

## WebSocket (STOMP)

Uç nokta: `/ws` (yalın WebSocket). CONNECT başlıkları:

```
room:  <ODA KODU>
token: <oturum token'ı>
```

Token geçersizse veya oda yoksa sunucu `ERROR` çerçevesi döner; `message` başlığı hata kodudur
(`INVALID_TOKEN`, `ROOM_NOT_FOUND`, `KICKED`). İstemci bu durumda yeniden denemeyi bırakır.

### Abonelikler

| Hedef | İçerik |
|---|---|
| `/topic/room/{code}` | Odadaki herkese giden olaylar |
| `/user/queue/room` | Yalnızca bu kişiye: `room.state_snapshot`, `poker.your_vote`, `room.kicked` |
| `/user/queue/errors` | Yalnızca bu kişiye: `error` |

Başka bir odanın konusuna abone olma isteği reddedilir.

### İstemci → sunucu (`/app/...`)

| Hedef | Gövde | Kim | Etki |
|---|---|---|---|
| `room.sync` | `{}` | herkes | Kişiye `room.state_snapshot` gönderilir. Her (yeniden) bağlanışta abonelikten sonra gönderilir. |
| `room.promote` | `{ participantId }` | moderatör | Hedef kişi de moderatör olur |
| `room.set_password` | `{ password }` | moderatör | Şifre değişir; boş metin şifreyi kaldırır. İçerideki koltuklar etkilenmez. |
| `room.leave` | `{}` | herkes | Koltuk silinir. Moderatör kalmazsa en eski bağlı kişiye devredilir. |
| `room.close` | `{}` | moderatör | Herkese `room.closed`, oda silinir |
| `room.kick` | `{ participantId }` | moderatör (kendini atamaz) | Kişi masadan atılır: koltuğu silinir, token'ı geçersiz olur, açılmamış oyu silinir, gönüllü/aday listesinden düşer; geçmiş değişmez. Kişiye `room.kicked`, ardından bağlantıları kapatılır; odaya `room.participant_kicked`. Linkle yeniden katılabilir |
| `assign.start` | `{ seconds? }` | moderatör | "Kim alacak?" başlar (masadaki ticket ya da serbest turun konusu için). Gönüllü turu süresi 10-300 sn, varsayılan 10; `0` = süresiz (krupiye kapatır). Süren akış varsa yerine geçer |
| `assign.volunteer` | `{ volunteer, pass? }` | katılımcı (gözlemci değil) | "Ben alırım" / vazgeç; `pass: true` = "pas" (üçüncü seçenek, gönüllülükten çıkarır; `volunteer` ile birlikte kullanılmaz). Yalnızca gönüllü turunda |
| `assign.set_volunteer_seconds` | `{ seconds }` | moderatör | Gönüllü süresi oda ayarı (0 = süresiz). Süren gönüllü turunun süresini de günceller; `assign.start` `seconds` vermezse bu değer kullanılır |
| `room.set_auto_reveal` | `{ enabled }` | moderatör | "Otomatik aç": bağlı (çevrimiçi) herkes oy verince kartlar kendiliğinden açılır |
| `assign.close_volunteering` | `{}` | moderatör | Gönüllü turunu erken kapatır (süre dolunca sunucu kendisi kapatır). Tek gönüllü → doğrudan atanır (`game: "volunteer"`); birden çok → adaylar gönüllüler; hiç yok → adaylar bu turda oy verenler (kimse oy vermediyse tüm katılımcılar) |
| `assign.set_candidate` | `{ participantId, candidate }` | moderatör | Aday ayarında kişiyi çıkar/ekle (gözlemci eklenemez) |
| `assign.set_fair_rotation` | `{ enabled }` | moderatör | Dönüşümlü adalet: bu oturumda daha önce (geri alınmamış) kazananın seçilme ağırlığı her kazanımda yarıya iner. Görsel olarak dilimler/atlar eşit kalır |
| `assign.play` | `{ game: "horse" \| "wheel" }` | moderatör | Kazanan ve tam sıralama sunucuda `SecureRandom` ile çekilir. Tek aday kaldıysa oyun oynanmadan atanır (`game: "direct"`) |
| `assign.undo` | `{}` | moderatör | Sonuç geri alınır: geçmişte `undone: true` kalır, ticket ataması kalkar, aday ayarına dönülür (tek gönüllüye yapılan atama geri alınırsa adaylar tüm havuza genişler) |
| `assign.close` | `{}` | moderatör | Akışı kapatır; sonuçlar ve geçmiş kalır |
| `poker.vote` | `{ card }` | katılımcı (gözlemci değil) | Oy ver/değiştir. `card: null` oyu geri çeker. Yalnızca `VOTING`. Kişiye `poker.your_vote` |
| `poker.reveal` | `{}` | moderatör | En az bir oy gerekir (yoksa `NO_VOTES`). Tur `REVEALED` olur, oylar ve istatistik herkese gider |
| `poker.new_round` | `{}` | moderatör | Aynı ticket/konu için yeni tur. Açılmış tur geçmişe yazılır. Finallenmiş ticket'sız turdan sonra konusu boş 1. tur başlar |
| `poker.finalize` | `{ value }` | moderatör | `REVEALED` turda final tahmin (destedeki bir kart, `?`/`☕` olamaz). Masada ticket varsa `ESTIMATED` olur; yoksa final tura ve oturum geçmişine yazılır |
| `poker.set_topic` | `{ topic }` | moderatör | Ticket'sız turun konusu ("Ne oylanıyor?"), en fazla 120 karakter; boş metin konuyu siler. Masada ticket varsa `WRONG_PHASE` |
| `poker.nudge` | `{ participantId }` | moderatör | Oy vermemiş katılımcıyı dürter; herkese `poker.nudged`. Kişi başına 30 sn'de bir (`RATE_LIMITED`) |
| `table.emoji` | `{ emoji }` | herkes (izleyici dahil) | Masaya emoji: 👍 🎉 🤔 😂 😮 👏 🔥 ☕. Saklanmaz, herkese `table.emoji`. Kişi başına 10 sn'de 5 |
| `room.set_tickets_enabled` | `{ enabled }` | moderatör | Ticket listesini aç/kapat. Kapatınca ticket'lar silinmez, gizlenir; masadaki ticket'ın açık turu geçmişine yazılır ve serbest tur başlar. Açınca masa boşsa sıradaki tahmin edilmemiş ticket gelir |
| `poker.exclude_vote` | `{ participantId, excluded }` | moderatör | Açılmış turda bir oyu sayımdan çıkar/geri al |
| `poker.set_deck` | `{ deck, cards? }` | moderatör | Deste değişir, turun oyları sıfırlanır, herkese `poker.deck_changed` |
| `ticket.add` | `{ tickets: [{ title, link?, note? }] }` | moderatör (ticket listesi açıkken; tüm `ticket.*` için kapalıysa `FEATURE_DISABLED`) | Toplu ekleme; biri geçersizse hiçbiri eklenmez. Masa boşsa ilk ticket masaya gelir |
| `ticket.update` | `{ ticketId, title, link?, note? }` | moderatör | Düzenle |
| `ticket.remove` | `{ ticketId }` | moderatör | Sil. Masadaysa masa boşalır |
| `ticket.move` | `{ ticketId, toIndex }` | moderatör | Kuyrukta sırala (0 tabanlı) |
| `ticket.select` | `{ ticketId }` | moderatör | Ticket'ı masaya getir, yeni tur başlar |
| `ticket.next` | `{}` | moderatör | Sıradaki tahmin edilmemiş ticket'a geç |
| `timer.start` | `{ seconds }` | moderatör | 10-3600 sn geri sayım |
| `timer.stop` | `{}` | moderatör | Geri sayımı kaldır |
| `participant.set_observer` | `{ participantId?, observer }` | kişinin kendisi ya da moderatör | Gözlemci ↔ katılımcı. Açık turda oy vermiş kişi izleyiciye geçemez |

Yetkisiz veya geçersiz bir niyet durumu değiştirmez; gönderene `error` olayı gider.
Mesajlar katılımcı başına saniyede `SM_MESSAGES_PER_SECOND` (varsayılan 20) ile sınırlıdır.

### Sunucu → istemci

#### `room.state` (konu)
Oda her değiştiğinde tam durum.

```json
{
  "code": "K7QM2XPA",
  "name": "Sprint 42",
  "deck": "modified-fibonacci",
  "passwordProtected": false,
  "maxParticipants": 100,
  "deckCards": ["0", "½", "1", "2", "3", "5", "8", "13", "21", "34", "55", "?", "☕"],
  "customDeck": ["1", "2", "4"],
  "participants": [
    { "id": "a1B2c3D4e5F6", "nickname": "Ayşe", "avatar": "x8k2p.1203", "moderator": true, "observer": false, "online": true }
  ],
  "ticketsEnabled": true,
  "tickets": [
    { "id": "t9Xk2...", "title": "ABC-12 Giriş sayfası", "link": "https://...", "note": "...",
      "status": "PENDING", "finalEstimate": null, "history": [ <RoundRecord>, ... ] }
  ],
  "currentTicketId": "t9Xk2...",
  "round": <RoundView>,
  "timer": { "durationSeconds": 120, "remainingMs": 83000 },
  "sessionHistory": [ { "topic": "Arama", "number": 1, "votes": [...], "stats": {...}, "finalEstimate": "5" } ],
  "fairRotation": false,
  "autoReveal": false,
  "volunteerSeconds": 20,
  "assignment": <AssignmentView ya da yok>,
  "assignmentHistory": [ <AssignmentRecord>, ... ]
}
```

`ticketsEnabled: false` iken `tickets` boş gelir (ticket'lar sunucuda saklanır). `sessionHistory` ticket'sız
(serbest) turların kaydıdır: açılmış her serbest tur, tur bitince (tekrar oylama, final, deste değişimi, ticket seçimi)
konusuyla yazılır; odada son 20 tur saklanır.

`participants` katılma sırasına göredir. `customDeck` odada kaydedilmiş özel destedir (başka desteye geçilse de durur).
`timer.remainingMs` gönderim anındaki kalan süredir; istemci kendi saatiyle geri sayar.

**`RoundView` ve gizlilik kuralı.** `VOTING` durumunda yalnızca kimlerin oy verdiği gider:

```json
{ "id": 7, "number": 1, "ticketId": "t9Xk2...", "state": "VOTING", "votedIds": ["a1B2c3D4e5F6"] }
```

Ticket'sız turda `ticketId` yoktur, krupiye yazdıysa `topic` vardır:

```json
{ "id": 8, "number": 1, "topic": "Giriş sayfası", "state": "VOTING", "votedIds": [] }
```

`votes` ve `stats` alanları bu durumda JSON'da **hiç yoktur**. `REVEALED` / `FINALIZED` durumunda:

```json
{
  "id": 7, "number": 1, "ticketId": "t9Xk2...", "state": "REVEALED", "votedIds": [...],
  "votes": [ { "participantId": "...", "nickname": "Ayşe", "avatar": "x8k2p", "card": "5", "excluded": false, "left": false } ],
  "stats": {
    "voteCount": 4, "countedCount": 3, "average": 5.33, "median": 5.0, "modes": ["5"],
    "distribution": [ { "card": "3", "count": 1, "participantIds": ["..."] }, ... ],
    "lowestIds": ["..."], "highestIds": ["..."],
    "consensus": "UNANIMOUS | CLOSE | SPREAD | NONE",
    "suggested": "5"
  },
  "finalEstimate": "5"
}
```

- `left: true`: oy verdikten sonra odadan çıktı; oyu geçerlidir, moderatör `poker.exclude_vote` ile çıkarabilir.
- `id` her yeni turda değişir. İstemci kendi oyunu (`poker.your_vote`) bu kimlikle eşleştirir.
- `RoundRecord` (ticket geçmişi): `{ number, votes, stats, finalEstimate? }`.

**"Kim alacak?" (M3).** Ticket'ta `assignee: { participantId, nickname, avatar }` (atanmadıysa yok).

```json
"assignment": {
  "id": "...", "phase": "VOLUNTEERING | CANDIDATES | RESULT", "ticketId": "...", "title": "ABC-7 Ödeme ekranı",
  "volunteerSeconds": 20, "volunteerRemainingMs": 14200,
  "volunteers": ["..."], "passes": ["..."], "candidates": ["..."],
  "result": <AssignmentRecord>,
  "game": { "type": "horse", "startsInMs": 1500, "durationMs": 8200, "animation": { ... } }
}
```

- `volunteerRemainingMs` yalnızca süre sınırlı gönüllü turunda; `result` ve `game` yalnızca `RESULT`'ta (`game`, `volunteer`/`direct` sonuçlarında yok).
- `startsInMs`: gönderim anından oyunun başlamasına kalan süre (negatifse başlayalı geçen). İstemci kendi saatiyle sayar; herkes aynı anda başlatır (sunucu sonucu 1,5 sn sonrasına zamanlar).
- `animation` (at yarışı): `{ "tracks": { "<participantId>": [0.08, 0.17, ... 1.0] } }`. Her at için eşit aralıklı 10 ara nokta (0..1 ilerleme); son nokta bitiş konumu. Atlar sunucunun sıralamasıyla çizgiye varır.
- `animation` (şans çarkı): `{ "slices": ["<id>", ...], "winnerSlice": 2, "turns": 5, "offset": 0.42 }`. Dilimler eşit, tepeden saat yönünde; çark `turns` tur dönüp ok kazananın diliminin `offset` (0..1) noktasında durur.

`AssignmentRecord`: `{ id, ticketId?, title?, game: "horse"|"wheel"|"volunteer"|"direct", winner, ranking: [Person], candidates: [Person], weighted, at: "ISO-8601", undone }`.
Odada son 50 sonuç saklanır. İstemci tarafında rastgelelik yoktur: animasyon tamamen bu alanlardan çizilir.

#### `room.state_snapshot` (kişisel)
`{ "youId": "<participantId>", "room": <room.state verisi>, "yourVote": { "roundId": 7, "card": "5" } }`.
Yeniden bağlanınca tam durumu almak için. `yourVote` yalnızca kişinin kendi oyudur, oy yoksa alan yoktur.

#### `poker.your_vote` (kişisel)
`{ "roundId": 7, "card": "5" }`. Oy verince yalnızca oy verene (tüm sekmelerine) gider. `card` yoksa oy geri çekildi.

#### `poker.deck_changed` (konu)
`{ "deck": "tshirt" }`. Bilgilendirme; turun oyları sıfırlandı. Güncel deste `room.state` ile gelir.

#### `poker.nudged` (konu)
`{ "participantId": "..." }`. Krupiye bu kişiyi dürttü: koltuğu kısa titrer, kişiye bildirim çıkar.

#### `table.emoji` (konu)
`{ "participantId": "...", "emoji": "🎉" }`. Emoji gönderenin koltuğundan masanın ortasına uçar.

#### `room.participant_joined` / `room.participant_left` (konu)
`{ "participantId": "..." }`. Bilgi amaçlıdır (bildirim için); güncel liste her zaman `room.state` ile gelir.

#### `room.participant_kicked` (konu)
`{ "participantId": "...", "nickname": "Ali" }`. Krupiye bu kişiyi masadan çıkardı (bildirim için).

#### `room.kicked` (kişisel)
`{}`. Krupiye seni masadan çıkardı; bağlantı kısa süre sonra sunucu tarafından kapatılır. İstemci oturumu siler ve mesajı gösterir.

#### `room.closed` (konu)
`{ "reason": "closed_by_moderator" | "expired" }`

#### `error` (kişisel)
`{ "code": "FORBIDDEN" }`. Kodlar REST tablosundakilerle aynı.

## Oylama kuralları

- Tur durumları: `VOTING` → `REVEALED` → (`VOTING` yeni tur | `FINALIZED`).
- Sayısal istatistikte `½`, `0.5`, `0,5` ve `1/2` aynı (0.5). Sayıya çevrilemeyen kartlar ortalama/medyana girmez.
- `?` ve `☕` sayılır, dağılımda görünür ama mod, uzlaşı, en düşük/en yüksek ve öneriye katılmaz.
- Uzlaşı: herkes aynı kart = `UNANIMOUS`; destede yan yana iki kart = `CLOSE`; daha geniş = `SPREAD`.
- Final önerisi: medyana en yakın sayısal kart (eşitlikte büyük olan). Sayısal oy yoksa deste sırasında ortadaki oy.
- Bağlantısı kopan kişinin oyu tutulur; geri gelince `room.state_snapshot.yourVote` ile görür.

## Bağlantı ve moderatörlük kuralları

- Bir kişinin birden fazla sekmesi olabilir; en az bir bağlantısı varsa çevrimiçidir.
- Moderatör koparsa `SM_MODERATOR_GRACE_SECONDS` (varsayılan 20) beklenir. Geri gelmezse ve başka bağlı moderatör yoksa moderatörlük en eski bağlı katılımcıya (gözlemciler en sona) geçer.
- Hareketsiz ve kimsenin bağlı olmadığı odalar `SM_IDLE_EXPIRY_DAYS` (varsayılan 7) gün sonra silinir.
