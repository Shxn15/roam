import { BookOpen } from 'lucide-react';
import { Panel } from '../../ui/Panel';
import styles from './JournalPage.module.css';

export function JournalPage() {
  return (
    <div className={styles.page}>
      <Panel elevation="lg" className={styles.panel}>
        <span className={styles.icon}>
          <BookOpen size={22} />
        </span>
        <h1 className={styles.title}>Reisetagebuch</h1>
        <p className={styles.text}>
          Hier sammeln sich deine besuchten Länder – mit Jahr oder Zeitraum, Notizen, Städten und den Reisen, die
          dorthin geführt haben.
        </p>
        <p className={styles.soon}>Kommt in Meilenstein 7.</p>
      </Panel>
    </div>
  );
}
