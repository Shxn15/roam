import { Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PLANE_PATH } from '../../brand/plane';
import { useDurations } from '../../motion/useMotion';
import { Button } from '../../ui/Button';
import styles from './FlightDemo.module.css';

const ROUTE = 'M48 112 Q 200 4 352 70';
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Plane along a dashed line, then a soft ring at the destination. */
export function FlightDemo() {
  const d = useDurations();
  const routeRef = useRef<SVGPathElement>(null);
  const frame = useRef(0);
  const [progress, setProgress] = useState(0);
  const [arrivals, setArrivals] = useState(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const play = () => {
    cancelAnimationFrame(frame.current);
    if (d.reduced) {
      setProgress(1);
      setArrivals((n) => n + 1);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / (d.journey * 1000));
      setProgress(easeInOut(t));
      if (t < 1) frame.current = requestAnimationFrame(step);
      else setArrivals((n) => n + 1);
    };
    setProgress(0);
    frame.current = requestAnimationFrame(step);
  };

  let plane = { x: 48, y: 112, angle: -60 };
  const route = routeRef.current;
  if (route) {
    const length = route.getTotalLength();
    const at = route.getPointAtLength(progress * length);
    const ahead = route.getPointAtLength(Math.min(length, progress * length + 1));
    const behind = route.getPointAtLength(Math.max(0, progress * length - 1));
    plane = { x: at.x, y: at.y, angle: (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI };
  }
  const flying = progress > 0 && progress < 1;

  return (
    <div className={styles.demo}>
      <svg viewBox="0 0 400 140" className={styles.stage} aria-hidden="true">
        <path ref={routeRef} d={ROUTE} className={styles.route} />
        <circle cx={48} cy={112} r={5} className={styles.origin} />
        <circle cx={352} cy={70} r={6} className={styles.destination} />
        {arrivals > 0 && <circle key={arrivals} cx={352} cy={70} r={10} className={styles.ring} />}
        {!(d.reduced && progress === 1) && (
          <g
            className={flying || progress === 0 ? styles.plane : styles.planeLanded}
            transform={`translate(${plane.x} ${plane.y}) rotate(${plane.angle + 90}) scale(0.95) translate(-12 -12)`}
          >
            <path d={PLANE_PATH} />
          </g>
        )}
      </svg>
      <Button size="sm" variant="secondary" icon={<Play size={14} />} onClick={play} disabled={flying}>
        Übergang ansehen
      </Button>
    </div>
  );
}
