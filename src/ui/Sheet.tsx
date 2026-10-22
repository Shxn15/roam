import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { EASE_SOFT, useDurations } from '../motion/useMotion';
import { cx } from './cx';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  label: string;
  onRequestClose(): void;
  className?: string;
  children: ReactNode;
}

/** A large floating dialog above the map. Escape or a click beside it asks to close. */
export function Sheet({ open, label, onRequestClose, className, children }: SheetProps) {
  const d = useDurations();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onRequestClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onRequestClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: d.base }}
          onMouseDown={(e) => e.target === e.currentTarget && onRequestClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cx(styles.sheet, className)}
            initial={{ opacity: 0, y: d.reduced ? 0 : 14, scale: d.reduced ? 1 : 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: d.reduced ? 0 : 8 }}
            transition={{ duration: d.slow, ease: EASE_SOFT }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
