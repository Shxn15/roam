import { AnimatePresence, motion } from 'motion/react';
import { useDurations } from '../motion/useMotion';
import { cx } from './cx';
import { useToasts } from './toast';
import styles from './Toaster.module.css';

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  const d = useDurations();
  return (
    <div className={styles.region} role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            layout
            className={cx(styles.toast, t.tone === 'error' && styles.error)}
            initial={{ opacity: 0, y: d.reduced ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: d.base }}
            onClick={() => dismiss(t.id)}
          >
            {t.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
