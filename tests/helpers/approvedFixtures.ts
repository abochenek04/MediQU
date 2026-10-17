// Synthetic approved records belong only in isolated automated-test databases.
import { randomUUID } from 'node:crypto';
import { clinics } from '../../src/data/mockData.ts';
import { writeClinic, type DB } from '../../server/database.ts';
import type { ServerConfig } from '../../server/config.ts';

export function seedApprovedTestClinics(db: DB, config: ServerConfig, withEvidence = false) {
  if (config.environment !== 'test') throw new Error('Test records require an isolated test environment');
  for (const fixture of clinics) {
    const clinic = structuredClone(fixture);
    if (clinic.rating) clinic.rating.source = 'clinic';
    writeClinic(db, clinic, false);
    if (!withEvidence) continue;
    for (const estimate of clinic.estimates) for (let i = 0; i < 3; i++) {
      const id = randomUUID();
      const submittedAt = Date.now() - (i + 1) * 60000;
      const report = { id, clinicId: clinic.id, submittedAt: new Date(submittedAt).toISOString(), visitMode: estimate.mode, totalMinutes: estimate.totalMinutes, source: 'patient report', anonymous: true, reportKind: 'completed-visit' };
      db.prepare('INSERT INTO reports VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, clinic.id, null, `test:${id}`, id, id, 'completed-visit', estimate.mode, estimate.totalMinutes, null, submittedAt, new Date(submittedAt).toISOString().slice(0, 10), 'accepted', JSON.stringify(report));
    }
  }
}
