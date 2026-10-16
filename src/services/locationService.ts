import type { SearchOrigin } from '../types';

// Called only after Use my location. The browser owns the permission prompt.
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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });

// This client-side API converts the permission-approved device position into a
// city name. Always send coordinates; never fall back to IP-based location.
// Only rounded coordinates leave the page, and a failed lookup must not prevent
// distance filtering from using the device's position.
export async function resolveLocationName(origin: SearchOrigin, signal?: AbortSignal): Promise<string> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.search = new URLSearchParams({
    latitude: String(origin.latitude), longitude: String(origin.longitude), localityLanguage: 'en',
  }).toString();
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
    credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error('City lookup unavailable');
  const data = await response.json() as Record<string, unknown>;
  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number'
    || Math.abs(data.latitude - origin.latitude) > 0.02 || Math.abs(data.longitude - origin.longitude) > 0.02
    || (typeof data.lookupSource === 'string' && /ip/i.test(data.lookupSource))) {
    throw new Error('City lookup did not use the device position');
  }
  const text = (key: string) => typeof data[key] === 'string' ? data[key].trim() : '';
  const city = text('city') || text('locality');
  const region = data.countryCode === 'US' && /^US-[A-Z]{2}$/.test(text('principalSubdivisionCode'))
    ? text('principalSubdivisionCode').slice(3) : text('principalSubdivision') || text('countryName');
  if (!city) throw new Error('City name unavailable');
  return [...new Set([city, region].filter(Boolean))].join(', ');
}
