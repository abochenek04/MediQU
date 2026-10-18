import type { SearchOrigin } from '../types';

// Called only after Find my location. The browser owns the permission prompt.
// Keep only an approximate position in page memory; do not save it to a profile.
export const requestApproximateLocation = (geolocation: Geolocation | undefined): Promise<SearchOrigin> =>
  new Promise((resolve, reject) => {
    if (!geolocation) { reject(new Error('Location unavailable')); return; }
    geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          reject(new Error('Invalid location')); return;
        }
        resolve({ latitude: Math.round(latitude * 100) / 100, longitude: Math.round(longitude * 100) / 100 });
      },
      reject,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 },
    );
  });

// Public city centers are downloaded only after opt-in. Matching happens on the
// device: no user coordinates are included in a request or persisted anywhere.
export type City = [latitude: number, longitude: number, name: string, state: string, population: number];
let cities: City[] | undefined;

export function nearestCity(origin: SearchOrigin, directory: City[]): string {
  if (!Number.isFinite(origin.latitude) || !Number.isFinite(origin.longitude)
    || Math.abs(origin.latitude) > 90 || Math.abs(origin.longitude) > 180) throw new Error('Invalid location');
  const radians = Math.PI / 180;
  const limit = Math.sin(100 / (2 * 6371)) ** 2;
  const townCenterLimit = Math.sin(5 / (2 * 6371)) ** 2;
  let closest: City | undefined;
  let major: City | undefined;
  let best = limit;
  let bestMajor = limit;
  for (const city of directory) {
    const a = Math.sin((city[0] - origin.latitude) * radians / 2) ** 2
      + Math.cos(origin.latitude * radians) * Math.cos(city[0] * radians)
      * Math.sin((city[1] - origin.longitude) * radians / 2) ** 2;
    if (a < best) { best = a; closest = city; }
    if (city[4] >= 250000 && a < bestMajor) { bestMajor = a; major = city; }
  }
  // Keep a larger town's own name near its center. Otherwise favor a nearby
  // major city, so smaller suburbs resolve to a recognizable regional name.
  // Without a major city within 100 km, use the closest listed town instead.
  const match = closest && best <= townCenterLimit ? closest : major || closest;
  if (!match) throw new Error('City name unavailable');
  return `${match[2]}, ${match[3]}`;
}

export async function resolveLocationName(origin: SearchOrigin, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  if (!cities) {
    const response = await fetch('/data/cities.json', {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
      credentials: 'omit', referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new Error('City directory unavailable');
    const data: unknown = await response.json();
    if (!Array.isArray(data) || !data.length || !data.every(city => Array.isArray(city) && city.length === 5
      && typeof city[0] === 'number' && Number.isFinite(city[0]) && Math.abs(city[0]) <= 90
      && typeof city[1] === 'number' && Number.isFinite(city[1]) && Math.abs(city[1]) <= 180
      && typeof city[2] === 'string' && !!city[2] && typeof city[3] === 'string' && /^[A-Z]{2}$/.test(city[3])
      && Number.isInteger(city[4]) && city[4] >= 50000)) {
      throw new Error('Invalid city directory');
    }
    cities = data as City[];
  }
  signal?.throwIfAborted();
  return nearestCity(origin, cities);
}
