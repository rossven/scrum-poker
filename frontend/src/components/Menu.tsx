import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Menu.module.css';

const CloseContext = createContext<() => void>(() => {});

interface MenuProps {
  /** Düğmenin erişilebilir adı (simge düğmelerinde tek ad bu). */
  label: string;
  /** Düğme yüzü; verilmezse "⋯" simgesi. */
  trigger?: ReactNode;
  icon?: IconName;
  align?: 'start' | 'end';
  /** Menü düğmenin üstüne açılır (alt panelde). */
  up?: boolean;
  triggerClassName?: string;
  children: ReactNode;
}

/** Açılır menü: dışarı tıklayınca ya da Esc ile kapanır; bir öğeye basınca da kapanır. */
export function Menu({ label, trigger, icon, align = 'end', up, triggerClassName = 'btn btn-small', children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={ref}>
      <button type="button" className={triggerClassName} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        aria-label={trigger ? undefined : label} title={trigger ? undefined : label} onClick={() => setOpen((v) => !v)}>
        {trigger ?? <Icon name={icon ?? 'more'} size={18} />}
      </button>
      {open && (
        <CloseContext.Provider value={() => setOpen(false)}>
          <div id={id} role="menu" aria-label={label} className={`${styles.panel} ${align === 'end' ? styles.end : styles.start} ${up ? styles.up : ''}`}>
            {children}
          </div>
        </CloseContext.Provider>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, danger, disabled, pressed }: {
  icon?: IconName;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  pressed?: boolean;
}) {
  const close = useContext(CloseContext);
  return (
    <button type="button" role="menuitem" className={`${styles.item} ${danger ? styles.danger : ''}`} disabled={disabled}
      aria-pressed={pressed}
      onClick={() => {
        close();
        onClick();
      }}>
      {icon && <Icon name={icon} size={16} />}
      <span>{children}</span>
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className={styles.label}>{children}</p>;
}
