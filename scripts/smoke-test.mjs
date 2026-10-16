import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer as createViteServer } from 'vite';

const port = 43190;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/serve-dist.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'inherit', 'inherit'],
});

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

try {
  let ready = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(base);
      ready = response.ok;
      if (ready) break;
    } catch {
      // The server may still be starting.
    }
    await pause(100);
  }

  if (!ready) throw new Error('Preview server did not become ready.');

  const routes = ['/', '/find', '/clinic/brightwell-urgent-care', '/saved', '/report', '/know', '/contact', '/clinic/missing', '/not-found'];
  for (const route of routes) {
    const response = await fetch(`${base}${route}`);
    const body = await response.text();
    if (!response.ok || !body.includes('<div id="root"></div>')) {
      throw new Error(`SPA route failed: ${route} (${response.status})`);
    }
    process.stdout.write(`✓ ${route} refresh fallback\n`);
  }

  const index = await readFile('dist/index.html', 'utf8');
  const assets = [...index.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
  if (assets.length < 2) throw new Error('Built CSS/JavaScript assets were not found.');

  for (const asset of assets) {
    const response = await fetch(`${base}${asset}`);
    const bytes = await response.arrayBuffer();
    if (!response.ok || bytes.byteLength === 0) {
      throw new Error(`Built asset failed: ${asset}`);
    }
    process.stdout.write(`✓ ${asset} available\n`);
  }

  const dataSource = await readFile('src/data/mockData.ts', 'utf8');
  const requiredClinicIds = [
    'brightwell-urgent-care',
    'juniper-family-health',
    'little-oak-pediatrics',
    'solace-womens-health',
    'bull-city-community-clinic',
    'eno-quickcare',
  ];
  for (const clinicId of requiredClinicIds) {
    if (!dataSource.includes(`id: '${clinicId}'`)) throw new Error(`Missing clinic fixture: ${clinicId}`);
  }
  process.stdout.write('✓ six fictional clinic fixtures present\n');

  globalThis.window = {
    setTimeout,
    localStorage: { getItem: () => null },
  };
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  try {
    const { mockClinicService: clinicService } = await vite.ssrLoadModule('/src/services/clinicService.ts');
    const baseFilters = {
      query: '', insurance: '', specialty: '', language: '', minimumRating: 0, visitMode: 'all', timing: 'all', maxDistance: 25,
    };
    const filterChecks = [
      [{ ...baseFilters, insurance: 'Medicaid' }, 3, 'insurance'],
      [{ ...baseFilters, specialty: 'Pediatrics' }, 1, 'specialty'],
      [{ ...baseFilters, visitMode: 'walk-in' }, 5, 'visit mode'],
      [{ ...baseFilters, timing: 'open-now' }, 4, 'open now'],
      [{ ...baseFilters, maxDistance: 3 }, 2, 'distance'],
      [{ ...baseFilters, query: 'cardiology' }, 0, 'empty state'],
      [{ ...baseFilters, language: 'Arabic' }, 2, 'Arabic language'],
      [{ ...baseFilters, language: 'Chinese' }, 1, 'Chinese language'],
      [{ ...baseFilters, minimumRating: 4.5 }, 4, 'minimum rating'],
      [{ ...baseFilters, minimumRating: 4.5, language: 'Arabic', insurance: 'Medicaid' }, 1, 'combined filters'],
      [{ ...baseFilters, query: '27701' }, 1, 'manual ZIP search'],
    ];
    for (const [filters, expected, label] of filterChecks) {
      const results = await clinicService.searchClinics(filters);
      if (results.length !== expected) {
        throw new Error(`${label} filter expected ${expected} results, received ${results.length}.`);
      }
    }
    process.stdout.write('✓ search filters and empty state data verified\n');
    const { clinics, sampleAppointment } = await vite.ssrLoadModule('/src/data/mockData.ts');
    const { initialDraft, validateReport } = await vite.ssrLoadModule('/src/utils/report.ts');
    const { getVisitPlan } = await vite.ssrLoadModule('/src/utils/time.ts');
    for (const clinic of clinics) {
      assert.equal(clinic.rating.source, 'demo');
      assert.equal(clinic.rating.reviewCount, clinic.reviews.length);
      for (const estimate of clinic.estimates) {
        assert.deepEqual(estimate.stages.map(s => s.shortLabel), ['Check in', 'Wait', 'Care', 'Check out']);
        assert.equal(estimate.stages.reduce((sum, stage) => sum + stage.minutes, 0), estimate.totalMinutes);
      }
    }
    for (const timing of ['morning', 'afternoon']) {
      const results = await clinicService.searchClinics({ ...baseFilters, timing });
      const mean = c => { const records = c.historicalWaits.filter(r => r[timing] > 0); return records.reduce((sum, r) => sum + r[timing], 0) / records.length; };
      assert(results.every((c, i) => !i || mean(c) >= mean(results[i - 1])));
    }
    const { requestApproximateLocation } = await vite.ssrLoadModule('/src/services/locationService.ts');
    const approximate = await requestApproximateLocation({ getCurrentPosition(success, error, options) {
      assert.equal(options.enableHighAccuracy, true);
      assert.equal(options.timeout, 15000);
      assert.equal(options.maximumAge, 0);
      success({ coords: { latitude: 35.9982123, longitude: -78.9019234 } });
    } });
    assert.deepEqual(approximate, { latitude: 36, longitude: -78.9 });
    await assert.rejects(requestApproximateLocation(undefined));
    await assert.rejects(requestApproximateLocation({ getCurrentPosition(success, error) { error(new Error('Permission denied')); } }));
    const near = await clinicService.searchClinics({ ...baseFilters, origin: clinics[0].coordinates, maxDistance: 0.01 });
    assert.equal(near[0].id, clinics[0].id);
    assert.equal(near[0].distanceMiles, 0);
    assert.equal(clinics[0].distanceMiles, 1.2, 'location search must not mutate fixtures');
    const far = await clinicService.searchClinics({ ...baseFilters, origin: { latitude: 0, longitude: 0 } });
    assert.equal(far.length, 0, 'do not claim fictional Durham clinics are nearby everywhere');
    const draft = { ...initialDraft(clinics[0].id), visitMode: 'walk-in', arrivalTime: '09:00', checkInTime: '09:10', providerTime: '09:30', departureTime: '10:00', accuracy: 'about-right', communication: 4, rushed: 'no' };
    assert.deepEqual(validateReport(draft, 'exact'), {});
    assert(validateReport({ ...draft, checkInTime: '08:30' }, 'exact').times);
    assert(validateReport({ ...draft, visitDate: '2999-01-01' }, 'exact').visitDate);
    assert(validateReport(initialDraft(), 'exact').clinicId);
    const exact = await clinicService.submitWaitReport(draft);
    assert.equal(exact.totalMinutes, 60);
    assert.equal(exact.timing.checkInTime, '09:10');
    assert.equal(exact.anonymous, true);
    assert.equal(exact.communication, 4);
    const ranged = await clinicService.submitWaitReport({ ...draft, arrivalTime: '', providerTime: '', departureTime: '', totalRange: '30–60 minutes', anonymous: false });
    assert.equal(ranged.totalMinutes, 45);
    assert.equal(ranged.anonymous, false);
    const ongoing = await clinicService.submitWaitReport({ ...initialDraft(clinics[0].id), visitMode: 'walk-in', reportKind: 'current-wait', elapsedMinutes: 23 });
    assert.equal(ongoing.totalMinutes, 0);
    assert.equal(ongoing.elapsedMinutes, 23);
    assert.equal(ongoing.reportKind, 'current-wait');
    await assert.rejects(clinicService.submitWaitReport({ ...initialDraft(clinics[0].id), reportKind: 'current-wait', elapsedMinutes: -1 }));
    const clinic = clinics.find(c => c.id === sampleAppointment.clinicId);
    const plan = getVisitPlan(sampleAppointment, clinic);
    assert.equal(new Date(sampleAppointment.appointmentTime) - plan.leaveBy, (sampleAppointment.travelMinutes + sampleAppointment.bufferMinutes) * 60000);
    assert.equal(plan.likelyFinish - new Date(sampleAppointment.appointmentTime), plan.estimate.totalMinutes * 60000);
    const { interfaceTranslations } = await vite.ssrLoadModule('/src/context/interfaceTranslations.ts');
    assert(Object.values(interfaceTranslations).every(row => row.length === 3 && row.every(Boolean)));
    process.stdout.write('✓ stage totals, historical filters, geolocation distances, report validation/submission, planning, and translation catalog verified\n');

  } finally {
    await vite.close();
  }
  process.stdout.write('Smoke checks passed.\n');
} finally {
  server.kill('SIGTERM');
}
