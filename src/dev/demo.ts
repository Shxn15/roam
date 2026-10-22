import { getDb } from '../db/instance';
import { setVisited } from '../db/repos/countries';
import { createTrip } from '../db/repos/trips';
import { useTravelStore } from '../data/travelStore';
import { todayIso } from '../domain/trips';

// Development only (never part of a release build): sample data for trying out the
// home screen before trips can be created in the UI. In the browser console:
//   await roamDemo.seed()

async function seed() {
  const db = getDb();
  const today = todayIso();
  const daysAgo = (n: number) => todayIso(new Date(Date.parse(`${today}T12:00:00`) - n * 86_400_000));
  await createTrip(db, { countryId: 'JPN', title: 'Japan Herbst', status: 'planned', days: 12, startDate: '2027-10-08' });
  await createTrip(db, { countryId: 'PRT', title: 'Lissabon & Porto', status: 'traveling', days: 9, startDate: daysAgo(3) });
  await createTrip(db, { countryId: 'NZL', title: 'Neuseeland irgendwann', status: 'idea', days: 21 });
  await createTrip(db, { countryId: 'ISL', title: 'Island Ringstraße', status: 'done', days: 10, startDate: '2024-06-02' });
  const visits: [string, number | null][] = [
    ['DEU', null], ['AUT', 2019], ['FRA', 2018], ['ITA', 2022], ['ESP', 2021], ['PRT', 2026], ['NLD', 2020],
    ['CHE', null], ['ISL', 2024], ['GRC', 2023], ['MAR', 2017], ['THA', 2016], ['USA', 2015], ['MLT', 2023], ['LUX', null],
  ];
  for (const [id, year] of visits) await setVisited(db, id, true, year);
  await useTravelStore.getState().load();
}

(window as unknown as { roamDemo: unknown }).roamDemo = { seed };
