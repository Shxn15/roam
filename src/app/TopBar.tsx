import { BookOpen, Map, Settings2 } from 'lucide-react';
import { NavLink } from 'react-router';
import { IconButton } from '../ui/IconButton';
import { Panel } from '../ui/Panel';
import { cx } from '../ui/cx';
import { useUi } from './uiStore';
import styles from './TopBar.module.css';

const LINKS = [
  { to: '/', label: 'Weltkarte', icon: Map },
  { to: '/tagebuch', label: 'Tagebuch', icon: BookOpen },
];

export function TopBar() {
  const openSettings = useUi((s) => s.openSettings);
  return (
    <div className={styles.bar}>
      <Panel padded={false} className={styles.nav}>
        <nav aria-label="Bereiche" className={styles.links}>
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => cx(styles.link, isActive && styles.active)}>
              <Icon size={16} strokeWidth={2} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </Panel>
      <Panel padded={false} className={styles.settings}>
        <IconButton label="Einstellungen" icon={<Settings2 size={18} />} onClick={() => openSettings()} />
      </Panel>
    </div>
  );
}
