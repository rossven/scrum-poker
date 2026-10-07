import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/http';
import type { JoinResult, RoomInfo } from '../api/types';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { Shell } from '../components/Shell';
import { sessions } from '../lib/session';
import { useRoomStore } from '../store/roomStore';
import { GoneView } from './GoneView';
import { JoinForm } from './JoinForm';
import { Lobby } from './Lobby';

type Phase = { kind: 'loading' } | { kind: 'join'; info: RoomInfo } | { kind: 'in-room' } | { kind: 'error'; code: string };

/**
 * Oda sayfası akışı:
 * - Tarayıcıda bu oda için token varsa doğrudan bağlan (aynı koltuk).
 * - Yoksa oda bilgisini al ve katılma formunu göster.
 */
export function RoomPage({ code }: { code: string }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const { room, youId, status, gone, needsJoin, connect, disconnect } = useRoomStore();

  useEffect(() => {
    const stored = sessions.get(code);
    if (stored) {
      connect(code, stored);
      setPhase({ kind: 'in-room' });
    } else {
      loadInfo();
    }
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Sunucu token'ı tanımadı (ör. sunucu yeniden başladı ama oda kodu tesadüfen yeniden oluştu): formu göster.
  useEffect(() => {
    if (needsJoin) loadInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsJoin]);

  function loadInfo() {
    api
      .roomInfo(code)
      .then((info) => setPhase({ kind: 'join', info }))
      .catch((err) => setPhase({ kind: 'error', code: err instanceof ApiError ? err.code : 'UNKNOWN' }));
  }

  const onJoined = (result: JoinResult) => {
    if (result.nickname) {
      sessions.set(code, { participantId: result.participantId, token: result.token });
      connect(code, { participantId: result.participantId, token: result.token });
      setPhase({ kind: 'in-room' });
    }
  };

  let content;
  if (gone) {
    content = <GoneView reason={gone} />;
  } else if (phase.kind === 'error') {
    content = phase.code === 'ROOM_NOT_FOUND' ? <GoneView reason="not_found" /> : <p className="error-text">{t(`errors.${phase.code}`)}</p>;
  } else if (phase.kind === 'join') {
    content = <JoinForm info={phase.info} onJoined={onJoined} />;
  } else if (phase.kind === 'in-room') {
    content = (
      <>
        <ConnectionBanner status={status} />
        {room ? <Lobby room={room} youId={youId} /> : <p className="muted">{t('common.loading')}</p>}
      </>
    );
  } else {
    content = <p className="muted">{t('common.loading')}</p>;
  }

  return <Shell>{content}</Shell>;
}
