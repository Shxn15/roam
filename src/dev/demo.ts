import { getDb } from '../db/instance';
import { setVisited } from '../db/repos/countries';
import { createTimeBlock, listDays } from '../db/repos/dayPlan';
import { createTrip } from '../db/repos/trips';
import { useTravelStore } from '../data/travelStore';
import type { TimeBlockInput } from '../domain/dayPlan';
import { todayIso } from '../domain/trips';

// Development only (never part of a release build): sample trips, visits and a filled
// day plan, for trying out the screens without typing everything in. In the browser console:
//   await roamDemo.seed()

type Block = [start: string, end: string | null, title: string, location: string, category: TimeBlockInput['category'], note?: string];

async function plan(tripId: string, dayPlans: Block[][]) {
  const db = getDb();
  for (const [i, day] of (await listDays(db, tripId)).entries()) {
    for (const [startTime, endTime, title, location, category, note = ''] of dayPlans[i] ?? []) {
      await createTimeBlock(db, day.id, { startTime, endTime, title, location, note, category });
    }
  }
}

async function seed() {
  const db = getDb();
  const today = todayIso();
  const daysAgo = (n: number) => todayIso(new Date(Date.parse(`${today}T12:00:00`) - n * 86_400_000));
  const japan = await createTrip(db, { countryId: 'JPN', title: 'Japan Herbst', status: 'planned', days: 12, startDate: '2027-10-08' });
  await createTrip(db, { countryId: 'PRT', title: 'Lissabon & Porto', status: 'traveling', days: 9, startDate: daysAgo(3) });
  await createTrip(db, { countryId: 'NZL', title: 'Neuseeland irgendwann', status: 'idea', days: 21 });
  await createTrip(db, { countryId: 'ISL', title: 'Island Ringstraße', status: 'done', days: 10, startDate: '2024-06-02' });
  const sicily = await createTrip(db, { countryId: 'ITA', title: 'Sizilien im Frühling', status: 'planned', days: 8, startDate: '2027-04-12' });
  await plan(japan, [
    [
      ['10:30', '12:00', 'Ankunft in Haneda', 'Tokio', 'transport'],
      ['13:00', '14:00', 'Ramen in Shinjuku', 'Shinjuku, Tokio', 'food', 'Früh da sein, mittags gibt es eine Schlange.'],
      ['13:30', '16:00', 'Meiji-Schrein und Harajuku', 'Tokio', 'activity'],
      ['16:30', null, 'Check-in', 'Asakusa', 'stay'],
      ['19:00', '21:00', 'Izakaya am Fluss', 'Asakusa', 'food'],
    ],
    [
      ['08:00', '10:30', 'Tsukiji-Außenmarkt', 'Tokio', 'food'],
      ['12:30', '17:00', 'teamLab Planets', 'Toyosu', 'activity'],
    ],
    [['08:15', '10:30', 'Shinkansen nach Kyoto', 'Tokio → Kyoto', 'transport', 'Rechts sitzen, dort ist der Fuji.']],
  ]);
  await plan(sicily, [
    [
      ['11:00', '12:30', 'Mercato di Ballarò', 'Palermo', 'food'],
      ['15:00', '17:00', 'Cappella Palatina', 'Palermo', 'activity'],
    ],
  ]);
  const visits: [string, number | null][] = [
    ['DEU', null], ['AUT', 2019], ['FRA', 2018], ['ITA', 2022], ['ESP', 2021], ['PRT', 2026], ['NLD', 2020],
    ['CHE', null], ['ISL', 2024], ['GRC', 2023], ['MAR', 2017], ['THA', 2016], ['USA', 2015], ['MLT', 2023], ['LUX', null],
  ];
  for (const [id, year] of visits) await setVisited(db, id, true, year);
  await useTravelStore.getState().load();
}

(window as unknown as { roamDemo: unknown }).roamDemo = { seed };
