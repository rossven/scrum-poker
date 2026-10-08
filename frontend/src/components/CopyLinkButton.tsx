import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { roomUrl } from '../lib/router';
import { Icon } from './Icon';

export function CopyLinkButton({ code }: { code: string }) {
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

  return (
    <button type="button" className="btn btn-small" onClick={copy} aria-live="polite">
      <Icon name={copied ? 'check' : 'link'} />
      {copied ? t('room.copied') : t('room.copyLink')}
    </button>
  );
}
