import { ContrastReport } from './ContrastReport';
import { ThemeEditor } from './ThemeEditor';
import { ThemeGallery } from './ThemeGallery';
import { ThemePreview } from './ThemePreview';
import styles from './AppearanceSettings.module.css';

export function AppearanceSettings() {
  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h4>Theme</h4>
          <p>Fünf Presets und deine eigenen Themes. Ein Klick wechselt die ganze App.</p>
        </div>
        <ThemeGallery />
      </section>
      <section className={styles.workbench}>
        <ThemeEditor />
        <div className={styles.side}>
          <ThemePreview />
          <ContrastReport />
        </div>
      </section>
    </div>
  );
}
