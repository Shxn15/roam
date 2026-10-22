/** The four states a trip moves through. An idea has no dates yet. */
export const TRIP_STATUSES = ['idea', 'planned', 'traveling', 'done'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  idea: 'Idee',
  planned: 'Geplant',
  traveling: 'Unterwegs',
  done: 'Abgeschlossen',
};

/** Which of the theme's four tints represents each status. */
export const TRIP_STATUS_TINT: Record<TripStatus, 1 | 2 | 3 | 4> = {
  idea: 1,
  planned: 2,
  traveling: 3,
  done: 4,
};
