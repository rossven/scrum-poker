import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
  /** Panel gövdeye çizilir: kaydırılan ya da kırpan bir kabın içindeki düğmelerde kırpılmaz. */
  portal?: boolean;
  triggerClassName?: string;
  children: ReactNode;
}

/** Açılır menü: dışarı tıklayınca ya da Esc ile kapanır; bir öğeye basınca da kapanır. */
export function Menu({ label, trigger, icon, align = 'end', up, portal, triggerClassName = 'btn btn-small', children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [fixed, setFixed] = useState<CSSProperties | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // Portal'da panel düğmenin hizasına sabitlenir; altı sığmıyorsa üste açılır, kaydırma/yeniden boyutlandırmada kapanır.
  useLayoutEffect(() => {
    if (!open || !portal || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const h = panelRef.current?.offsetHeight ?? 120;
    const above = !up && r.bottom + 6 + h > window.innerHeight && r.top - 6 - h > 0;
    const style: CSSProperties = { position: 'fixed', zIndex: 60 };
    if (up || above) { style.top = 'auto'; style.bottom = window.innerHeight - r.top + 6; }
    else style.top = r.bottom + 6;
    if (align === 'end') style.right = Math.max(8, window.innerWidth - r.right);
    else style.left = Math.max(8, Math.min(r.left, window.innerWidth - 228));
    setFixed(style);
  }, [open, portal, up, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    const onMove = () => portal && setOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, portal]);

  return (
    <div className={styles.wrap} ref={ref}>
      <button type="button" className={triggerClassName} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        aria-label={trigger ? undefined : label} title={trigger ? undefined : label} onClick={() => setOpen((v) => !v)}>
        {trigger ?? <Icon name={icon ?? 'more'} size={18} />}
      </button>
      {open && (() => {
        const panel = (
          <CloseContext.Provider value={() => setOpen(false)}>
            <div id={id} ref={panelRef} role="menu" aria-label={label} style={portal ? fixed ?? { position: 'fixed', visibility: 'hidden' } : undefined}
              className={`${styles.panel} ${portal ? '' : align === 'end' ? styles.end : styles.start} ${!portal && up ? styles.up : ''}`}>
              {children}
            </div>
          </CloseContext.Provider>
        );
        return portal ? createPortal(panel, document.body) : panel;
      })()}
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
