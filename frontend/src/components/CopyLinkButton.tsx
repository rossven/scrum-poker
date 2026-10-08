import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { roomUrl } from '../lib/router';
import { Icon } from './Icon';
import styles from './CopyLinkButton.module.css';

/** Linki panoya kopyalar (olmazsa kutuda gösterir). */
function useCopy(code: string) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl(code));
    } catch {
      window.prompt(t('room.copyLink'), roomUrl(code));
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return { copied, copy };
}

/** Başlıktaki tek davet hapı: link simgesi, "Davet" + oda kodu + Kopyala. */
export function InvitePill({ code }: { code: string }) {
  const { t } = useTranslation();
  const { copied, copy } = useCopy(code);
  return (
    <span className={styles.pill}>
      <Icon name="link" size={15} />
      <span>{t('room.invite')}</span>
      <code><span className="visually-hidden">{t('room.code')}: </span>{code}</code>
      <button type="button" onClick={copy} aria-live="polite">{copied ? t('room.copied') : t('room.copy')}</button>
    </span>
  );
}

/** Telefonda paylaş simgesi: destekleyen tarayıcıda paylaşım sayfası, yoksa kopyalama. */
export function ShareButton({ code }: { code: string }) {
  const { t } = useTranslation();
  const { copied, copy } = useCopy(code);
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url: roomUrl(code) });
        return;
      } catch {
        /* vazgeçti: kopyalamaya düş */
      }
    }
    await copy();
  };
  return (
    <button type="button" className="ib" onClick={share} aria-label={t('room.shareLink')} title={copied ? t('room.copied') : t('room.shareLink')} aria-live="polite">
      <Icon name={copied ? 'check' : 'share'} size={18} />
    </button>
  );
}
