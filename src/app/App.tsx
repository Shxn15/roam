import { MotionConfig } from 'motion/react';
import { useEffect, useState } from 'react';
import { RouterProvider, createHashRouter } from 'react-router';
import { Logo } from '../brand/Logo';
import { HomePage } from '../features/home/HomePage';
import { JournalPage } from '../features/journal/JournalPage';
import { useMotionLevel } from '../motion/useMotion';
import { Panel } from '../ui/Panel';
import { AppLayout } from './AppLayout';
import { bootstrap } from './bootstrap';
import styles from './App.module.css';

const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'tagebuch', element: <JournalPage /> },
    ],
  },
]);

export function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | Error>('loading');
  const motion = useMotionLevel();

  useEffect(() => {
    bootstrap().then(
      () => setStatus('ready'),
      (error: unknown) => setStatus(error instanceof Error ? error : new Error(String(error))),
    );
  }, []);

  if (status === 'loading') {
    return (
      <div className={styles.center}>
        <Logo size={34} />
      </div>
    );
  }

  if (status instanceof Error) {
    return (
      <div className={styles.center}>
        <Panel elevation="lg" className={styles.error}>
          <Logo size={24} />
          <h1>Roam konnte nicht starten</h1>
          <p className="selectable">{status.message}</p>
        </Panel>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion={motion === 'reduced' ? 'always' : 'never'}>
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
