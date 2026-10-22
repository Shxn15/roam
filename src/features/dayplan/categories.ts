import { BedDouble, Compass, TrainFront, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { TimeBlockCategory } from '../../domain/dayPlan';

export const CATEGORY_ICONS: Record<TimeBlockCategory, LucideIcon> = {
  activity: Compass,
  food: UtensilsCrossed,
  transport: TrainFront,
  stay: BedDouble,
};
