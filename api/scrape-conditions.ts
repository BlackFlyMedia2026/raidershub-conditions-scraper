// api/update-live-data.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Steam-Spielerzahl scrapen
    const steamRes = await fetch('https://steamplayerstats.com/games/arc-raiders');
    const steamText = await steamRes.text();

    // Einfache Regex – passe an, wenn die Seite sich ändert
    const match = steamText.match(/Current Players<\/span>:\s*([\d,]+)/i);
    const steamPlayers = match ? parseInt(match[1].replace(/,/g, '')) : 0;

    const estimatedTotal = Math.round(steamPlayers * 2 / 1000) * 1000;

    // 2. Conditions scrapen (Beispiel metaforge – passe Selector/URL an, wenn nötig)
    const conditionsRes = await fetch('https://metaforge.app/arc-raiders/event-timers');
    const conditionsData = await conditionsRes.json();

    // Annahme: data ist Array von Events
    const conditions = conditionsData?.events || [];

    // 3. In Supabase schreiben
    const batch = [];

    // Spielerzahl
    batch.push(
      supabase.from('live_stats').upsert({
        id: 'players',
        total_estimated: estimatedTotal,
        steam_current: steamPlayers,
        last_updated: new Date().toISOString()
      })
    );

    // Conditions (max 3)
    if (conditions.length > 0) {
      batch.push(
        supabase.from('live_conditions').upsert({
          id: 'current',
          name: conditions[0]?.name || '',
          map: conditions[0]?.map || '',
          effect: conditions[0]?.effect || '',
          loot: conditions[0]?.loot || 0,
          pvp: conditions[0]?.pvp || 0,
          danger: conditions[0]?.danger || 0,
          tip: conditions[0]?.tip || '',
          ends_at: conditions[0]?.endsAt || null,
          updated_at: new Date().toISOString()
        })
      );
    }

    if (conditions.length > 1) {
      batch.push(
        supabase.from('live_conditions').upsert({
          id: 'next1',
          ...conditions[1],
          updated_at: new Date().toISOString()
        })
      );
    }

    if (conditions.length > 2) {
      batch.push(
        supabase.from('live_conditions').upsert({
          id: 'next2',
          ...conditions[2],
          updated_at: new Date().toISOString()
        })
      );
    }

    // Ausführen
    await Promise.all(batch);

    res.status(200).json({
      success: true,
      steam_players: steamPlayers,
      estimated_total: estimatedTotal,
      conditions_count: conditions.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Scraper failed', details: error.message });
  }
}
