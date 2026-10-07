import { avatarUri } from '../lib/avatar';
import styles from './Avatar.module.css';

interface Props {
  seed: string;
  size?: number;
  online?: boolean;
  alt?: string;
}

export function Avatar({ seed, size = 48, online, alt = '' }: Props) {
  return (
    <span className={styles.wrap} style={{ width: size, height: size }}>
      <img className={styles.img} src={avatarUri(seed)} alt={alt} width={size} height={size} draggable={false} />
      {online !== undefined && <span className={`${styles.dot} ${online ? styles.online : styles.offline}`} />}
    </span>
  );
}
