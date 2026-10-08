import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../store/roomStore';
import { Icon } from '../Icon';
import styles from './TopicField.module.css';

/**
 * Ticket'sız turda isteğe bağlı konu (yalnızca krupiye yazar). Boşsa hiçbir yerde görünmez;
 * yazılırsa masanın üstündeki başlığa, oturum geçmişine ve odadaki herkese düşer.
 */
export function TopicField({ topic }: { topic?: string }) {
  const { t } = useTranslation();
  const setTopic = useRoomStore((s) => s.setTopic);
  const [text, setText] = useState(topic ?? '');
  // Sunucudan yeni konu gelince (yeni tur, başka sekme) kutu da güncellensin.
  useEffect(() => setText(topic ?? ''), [topic]);
  const dirty = text.trim() !== (topic ?? '');

  const save = (e: FormEvent) => {
    e.preventDefault();
    setTopic(text.trim());
  };

  return (
    <form className={styles.topic} onSubmit={save}>
      <Icon name="pencil" size={18} className={styles.icon} />
      <input
        className={styles.input}
        aria-label={t('poker.topicLabel')}
        placeholder={t('poker.topicOptional')}
        maxLength={120}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {dirty && <button type="submit" className="btn btn-small btn-primary">{t('common.save')}</button>}
    </form>
  );
}
