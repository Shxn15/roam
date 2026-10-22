import { useEffect, useState } from 'react';
import { getDb } from '../../db/instance';
import { schemaVersion } from '../../db/migrations';
import styles from './DataSettings.module.css';

export function DataSettings() {
  const db = getDb();
  const [version, setVersion] = useState<number | null>(null);
  const [imagesDir, setImagesDir] = useState<string | null>(null);

  useEffect(() => {
    void schemaVersion(db).then(setVersion);
    if (db.kind === 'tauri') {
      void import('@tauri-apps/api/path').then(async ({ appDataDir, join }) => setImagesDir(await join(await appDataDir(), 'images')));
    }
  }, [db]);

  return (
    <div className={styles.page}>
      <p className={styles.intro}>
        Roam speichert alles lokal auf diesem Gerät: eine SQLite-Datenbank und deine Bilder im App-Datenordner. Es gibt kein
        Konto und keine Cloud.
      </p>
      <dl className={styles.list}>
        <div>
          <dt>Speicherart</dt>
          <dd>{db.kind === 'tauri' ? 'Desktop – SQLite-Datei' : 'Browser-Vorschau – SQLite im Browser-Speicher'}</dd>
        </div>
        <div>
          <dt>Datenbank</dt>
          <dd className="selectable">{db.location}</dd>
        </div>
        <div>
          <dt>Bilder</dt>
          <dd className="selectable">{db.kind === 'tauri' ? (imagesDir ?? '…') : 'Nur in der Desktop-App'}</dd>
        </div>
        <div>
          <dt>Schema-Version</dt>
          <dd>{version ?? '…'}</dd>
        </div>
      </dl>
    </div>
  );
}
