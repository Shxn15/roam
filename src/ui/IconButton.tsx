import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  variant?: 'ghost' | 'surface';
  size?: 'sm' | 'md';
  active?: boolean;
}

export function IconButton({ label, icon, variant = 'ghost', size = 'md', active, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(styles.iconButton, styles[variant], styles[size], active && styles.active, className)}
      {...rest}
    >
      {icon}
    </button>
  );
}
