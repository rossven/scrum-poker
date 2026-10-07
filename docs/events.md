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
| `POST` | `/api/rooms` | `{ name?, deck?, password? }` | `201 { code, claimToken }` |
| `GET` | `/api/rooms/{code}` | | `{ code, name?, passwordProtected }` |
| `POST` | `/api/rooms/{code}/join` | `{ nickname, avatar, observer, password?, token?, claimToken? }` | `{ code, participantId, token, nickname, rejoined }` |
| `GET` | `/admin/stats` | `Authorization: Bearer <SM_ADMIN_TOKEN>` | sayaçlar (JSON) |

- `deck`: `modified-fibonacci` (varsayılan), `fibonacci`, `tshirt`.
- `claimToken`: oda oluşturunca dönen tek kullanımlık anahtar. Katılırken gönderen kişi moderatör olur.
- `token`: daha önce alınmış oturum token'ı. Geçerliyse aynı koltuğa dönülür, şifre sorulmaz (`rejoined: true`).
- `nickname`: 1-24 karakter, kontrol karakteri yok. Odada aynısı varsa sonuna numara eklenir (`"Ayşe 2"`); yanıttaki `nickname` geçerli olandır.
- `avatar`: DiceBear tohumu, `[A-Za-z0-9_-]{1,32}`.

Hata yanıtı: `{ "error": "KOD" }`

| Kod | HTTP | Anlamı |
|---|---|---|
| `ROOM_NOT_FOUND` | 404 | Oda yok, kapatıldı ya da sunucu yeniden başladı |
| `INVALID_INPUT` / `INVALID_NICKNAME` / `INVALID_AVATAR` / `INVALID_PASSWORD` | 400 | Geçersiz girdi |
| `PASSWORD_REQUIRED` / `WRONG_PASSWORD` | 401 | Şifreli oda |
| `INVALID_TOKEN` | 401 | Oturum token'ı tanınmıyor |
| `FORBIDDEN` | 403 | Yetki yok (ör. moderatör olmayan) |
| `ROOM_FULL` | 409 | Güvenlik tavanı (`SM_MAX_PARTICIPANTS`) doldu |
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
| `/user/queue/room` | Yalnızca bu kişiye: `room.state_snapshot` |
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
  "participants": [
    { "id": "a1B2c3D4e5F6", "nickname": "Ayşe", "avatar": "x8k2p", "moderator": true, "observer": false, "online": true }
  ]
}
```

`participants` katılma sırasına göredir.

#### `room.state_snapshot` (kişisel)
`{ "youId": "<participantId>", "room": <room.state verisi> }`. Yeniden bağlanınca tam durumu almak için.

#### `room.participant_joined` / `room.participant_left` (konu)
`{ "participantId": "..." }`. Bilgi amaçlıdır (bildirim için); güncel liste her zaman `room.state` ile gelir.

#### `room.closed` (konu)
`{ "reason": "closed_by_moderator" | "expired" }`

#### `error` (kişisel)
`{ "code": "FORBIDDEN" }`. Kodlar REST tablosundakilerle aynı.

## Bağlantı ve moderatörlük kuralları

- Bir kişinin birden fazla sekmesi olabilir; en az bir bağlantısı varsa çevrimiçidir.
- Moderatör koparsa `SM_MODERATOR_GRACE_SECONDS` (varsayılan 20) beklenir. Geri gelmezse ve başka bağlı moderatör yoksa moderatörlük en eski bağlı katılımcıya (gözlemciler en sona) geçer.
- Hareketsiz ve kimsenin bağlı olmadığı odalar `SM_IDLE_EXPIRY_DAYS` (varsayılan 7) gün sonra silinir.
