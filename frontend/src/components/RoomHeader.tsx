import { useTranslation } from 'react-i18next';
import type { ParticipantView, RoomState } from '../api/types';
import { navigate } from '../lib/router';
import { setSoundEnabled, useSoundEnabled } from '../lib/sound';
import { useTheme, type ThemeChoice } from '../lib/theme';
import { Avatar } from './Avatar';
import { InvitePill, ShareButton } from './CopyLinkButton';
import { Icon, type IconName } from './Icon';
import { Menu, MenuItem } from './Menu';
import { SoundToggle } from './SoundToggle';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './brand/Logo';
import styles from './RoomHeader.module.css';

const THEME_ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

interface Props {
  room: RoomState;
  me: ParticipantView | undefined;
  isModerator: boolean;
  waiting: number;
  voting: boolean;
  hasSidebar: boolean;
  onSettings: () => void;
  onSidebar: () => void;
  onLeave: () => void;
  onObserver: (observer: boolean) => void;
  observerLocked: boolean;
}

/**
 * Oda başlığı. Masaüstü: marka, oda adı, tek davet hapı, avatar yığını, ses ve tema simgeleri, "⋯" menüsü.
 * Telefon: geri, oda adı ve durum, paylaş, "⋯" (ses ve tema da menüde).
 */
export function RoomHeader({ room, me, isModerator, waiting, voting, hasSidebar, onSettings, onSidebar, onLeave, onObserver, observerLocked }: Props) {
  const { t } = useTranslation();
  const soundOn = useSoundEnabled();
  const [theme, setTheme] = useTheme();
  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
  const themeIcon: Record<ThemeChoice, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };
  const people = room.participants;
  const shown = people.slice(0, 6);
  const extra = people.length - shown.length;
  const title = room.name ?? t('app.name');
  const subtitle = voting && waiting > 0 ? t('room.countWaiting', { count: people.length, waiting }) : t('room.count', { count: people.length });

  return (
    <header className={styles.header}>
      <button type="button" className={`ib ${styles.back}`} onClick={() => navigate('/')} aria-label={t('common.back')}>
        <Icon name="back" size={20} />
      </button>
      <button type="button" className={styles.brand} onClick={() => navigate('/')}>
        <Logo size={30} />
        <span className={styles.brandName}>{t('app.name')}</span>
      </button>
      <span className={styles.sep} aria-hidden />
      <div className={styles.title}>
        <h1>{title}</h1>
        <span>
          <span className={styles.deck}>{t(`decks.${room.deck}`)} · </span>{subtitle}
          {room.passwordProtected && <> · <Icon name="lock" size={12} /> <span className="visually-hidden">{t('room.passwordProtected')}</span></>}
        </span>
      </div>
      <div className={styles.invite}><InvitePill code={room.code} /></div>
      <span className={styles.grow} />
      <div className={`${styles.people} ${styles.stackWrap}`} tabIndex={0} aria-label={t('room.participants')}>
        <ul className={styles.stack}>
          {shown.map((p) => (
            <li key={p.id}><Avatar seed={p.avatar} size={32} online={p.online} alt="" dealer={p.moderator} /></li>
          ))}
          {extra > 0 && <li className={styles.more}>+{extra}</li>}
        </ul>
        <div className={styles.pop} role="list">
          <b className={styles.popTitle}>{t('room.participants')} · {people.length}</b>
          {people.map((p) => (
            <div key={p.id} className={`${styles.person} ${p.online ? '' : styles.away}`} role="listitem">
              <Avatar seed={p.avatar} size={30} online={p.online} alt="" dealer={p.moderator} />
              <span className={styles.pname}>{p.nickname}{p.id === me?.id && <span className={styles.you}> {t('room.you')}</span>}</span>
              {p.moderator && <span className={styles.badge}>{t('room.moderator')}</span>}
              {p.observer && <span className={styles.badge}>{t('room.observer')}</span>}
              {!p.online && <span className={styles.offline}>{t('room.offline')}</span>}
            </div>
          ))}
        </div>
      </div>
      <span className={styles.share}><ShareButton code={room.code} /></span>
      <span className={styles.desk}><SoundToggle /></span>
      <span className={styles.desk}><ThemeToggle /></span>
      <Menu label={t('room.menu')} triggerClassName="ib">
        {hasSidebar && <span className={styles.phoneOnly}><MenuItem icon="ticket" onClick={onSidebar}>{t('room.ticketsAndHistory')}</MenuItem></span>}
        {isModerator && <MenuItem icon="gear" onClick={onSettings}>{t('room.settings')}</MenuItem>}
        {me && (me.observer ? (
          <MenuItem icon="cards" onClick={() => onObserver(false)}>{t('room.becomeParticipant')}</MenuItem>
        ) : (
          <MenuItem icon="eye" disabled={observerLocked} onClick={() => onObserver(true)}>{t('room.becomeObserver')}</MenuItem>
        ))}
        <span className={styles.phoneOnly}>
          <MenuItem icon={soundOn ? 'bell' : 'bellOff'} onClick={() => setSoundEnabled(!soundOn)}>{soundOn ? t('sound.on') : t('sound.off')}</MenuItem>
          <MenuItem icon={themeIcon[theme]} onClick={() => setTheme(nextTheme)}>{`${t('theme.label')}: ${t(`theme.${theme}`)}`}</MenuItem>
        </span>
        <MenuItem icon="door" onClick={onLeave}>{t('room.leave')}</MenuItem>
      </Menu>
    </header>
  );
}
