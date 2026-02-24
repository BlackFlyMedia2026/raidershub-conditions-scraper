import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (!serviceAccount.private_key) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT not set');
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Hier die echte Quelle scrapen (Beispiel mit metaforge – passe später an)
    const response = await fetch('https://metaforge.app/arc-raiders/event-timers');
    const data = await response.json();

    // Beispiel: Parse die Conditions (anpassen an echte Struktur)
    const conditions = data?.conditions || []; // z. B. [{name: "COLD SNAP", map: "Buried City", endsAt: "2026-02-24T18:00:00Z"}]

    const batch = db.batch();

    // Current
    if (conditions[0]) {
      batch.set(db.collection('live_conditions').doc('current'), {
        ...conditions[0],
        updatedAt: new Date().toISOString()
      });
    }

    // Next 2
    if (conditions[1]) {
      batch.set(db.collection('live_conditions').doc('next1'), {
        ...conditions[1],
        updatedAt: new Date().toISOString()
      });
    }
    if (conditions[2]) {
      batch.set(db.collection('live_conditions').doc('next2'), {
        ...conditions[2],
        updatedAt: new Date().toISOString()
      });
    }

    await batch.commit();

    res.status(200).json({ success: true, updated: conditions.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Scraping failed' });
  }
}
