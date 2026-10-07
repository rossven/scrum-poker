# Olaylar ve API (v1)

Sunucu otoriterdir: istemci yalnızca **niyet** gönderir, sunucu doğrular ve durumu yayınlar.
Her sunucu mesajı aynı zarfla gelir:

```json
{ "type": "room.state", "v": 1, "data": { ... } }
```

`v` olay şeması sürümüdür; kırıcı bir değişiklikte artar. Yeni alan eklemek kırıcı sayılmaz,
istemciler bilmedikleri alanları yok saymalıdır.

Hiçbir mesajda token, şifre veya şifre hash'i bulunmaz.

## REST

| Yöntem | Yol | Gövde | Yanıt |
|---|---|---|---|
| `POST` | `/api/rooms` | `{ name?, deck?, customDeck?, password? }` | `201 { code, claimToken }` |
| `GET` | `/api/rooms/{code}` | | `{ code, name?, passwordProtected }` |
| `POST` | `/api/rooms/{code}/join` | `{ nickname, avatar, observer, password?, token?, claimToken? }` | `{ code, participantId, token, nickname, rejoined }` |
| `GET` | `/admin/stats` | `Authorization: Bearer <SM_ADMIN_TOKEN>` | sayaçlar (JSON) |

- `deck`: `modified-fibonacci` (varsayılan), `fibonacci`, `tshirt`, `custom`.
- `customDeck`: `deck = custom` ise kart listesi. En fazla 20 kart, kart başına en fazla 8 karakter, tekrar yok (büyük/küçük harf duyarsız), virgül ve kontrol karakteri yok. Kurala uymazsa `INVALID_DECK`.
- `claimToken`: oda oluşturunca dönen tek kullanımlık anahtar. Katılırken gönderen kişi moderatör olur.
- `token`: daha önce alınmış oturum token'ı. Geçerliyse aynı koltuğa dönülür, şifre sorulmaz (`rejoined: true`).
- `nickname`: 1-24 karakter, kontrol karakteri yok. Odada aynısı varsa sonuna numara eklenir (`"Ayşe 2"`); yanıttaki `nickname` geçerli olandır.
- `avatar`: DiceBear tohumu, `[A-Za-z0-9_-]{1,32}`.

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
| `TOO_MANY_ATTEMPTS` | 429 | IP + oda başına yanlış şifre sınırı |
| `RATE_LIMITED` | 429 | Hız sınırı |

## WebSocket (STOMP)

Uç nokta: `/ws` (yalın WebSocket). CONNECT başlıkları:

```
room:  <ODA KODU>
token: <oturum token'ı>
```

Token geçersizse veya oda yoksa sunucu `ERROR` çerçevesi döner; `message` başlığı hata kodudur
(`INVALID_TOKEN`, `ROOM_NOT_FOUND`). İstemci bu durumda yeniden denemeyi bırakır.

### Abonelikler

| Hedef | İçerik |
|---|---|
| `/topic/room/{code}` | Odadaki herkese giden olaylar |
| `/user/queue/room` | Yalnızca bu kişiye: `room.state_snapshot`, `poker.your_vote` |
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
| `poker.vote` | `{ card }` | katılımcı (gözlemci değil) | Oy ver/değiştir. `card: null` oyu geri çeker. Yalnızca `VOTING`. Kişiye `poker.your_vote` |
| `poker.reveal` | `{}` | moderatör | Tur `REVEALED` olur, oylar ve istatistik herkese gider |
| `poker.new_round` | `{}` | moderatör | Aynı ticket için yeni tur. Açılmış tur ticket geçmişine yazılır |
| `poker.finalize` | `{ value }` | moderatör | `REVEALED` turda final tahmin (destedeki bir kart, `?`/`☕` olamaz). Ticket `ESTIMATED` olur |
| `poker.exclude_vote` | `{ participantId, excluded }` | moderatör | Açılmış turda bir oyu sayımdan çıkar/geri al |
| `poker.set_deck` | `{ deck, cards? }` | moderatör | Deste değişir, turun oyları sıfırlanır, herkese `poker.deck_changed` |
| `ticket.add` | `{ tickets: [{ title, link?, note? }] }` | moderatör | Toplu ekleme; biri geçersizse hiçbiri eklenmez. Masa boşsa ilk ticket masaya gelir |
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
    { "id": "a1B2c3D4e5F6", "nickname": "Ayşe", "avatar": "x8k2p", "moderator": true, "observer": false, "online": true }
  ],
  "tickets": [
    { "id": "t9Xk2...", "title": "ABC-12 Giriş sayfası", "link": "https://...", "note": "...",
      "status": "PENDING", "finalEstimate": null, "history": [ <RoundRecord>, ... ] }
  ],
  "currentTicketId": "t9Xk2...",
  "round": <RoundView>,
  "timer": { "durationSeconds": 120, "remainingMs": 83000 }
}
```

`participants` katılma sırasına göredir. `customDeck` odada kaydedilmiş özel destedir (başka desteye geçilse de durur).
`timer.remainingMs` gönderim anındaki kalan süredir; istemci kendi saatiyle geri sayar.

**`RoundView` ve gizlilik kuralı.** `VOTING` durumunda yalnızca kimlerin oy verdiği gider:

```json
{ "id": 7, "number": 1, "ticketId": "t9Xk2...", "state": "VOTING", "votedIds": ["a1B2c3D4e5F6"] }
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

#### `room.state_snapshot` (kişisel)
`{ "youId": "<participantId>", "room": <room.state verisi>, "yourVote": { "roundId": 7, "card": "5" } }`.
Yeniden bağlanınca tam durumu almak için. `yourVote` yalnızca kişinin kendi oyudur, oy yoksa alan yoktur.

#### `poker.your_vote` (kişisel)
`{ "roundId": 7, "card": "5" }`. Oy verince yalnızca oy verene (tüm sekmelerine) gider. `card` yoksa oy geri çekildi.

#### `poker.deck_changed` (konu)
`{ "deck": "tshirt" }`. Bilgilendirme; turun oyları sıfırlandı. Güncel deste `room.state` ile gelir.

#### `room.participant_joined` / `room.participant_left` (konu)
`{ "participantId": "..." }`. Bilgi amaçlıdır (bildirim için); güncel liste her zaman `room.state` ile gelir.

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
