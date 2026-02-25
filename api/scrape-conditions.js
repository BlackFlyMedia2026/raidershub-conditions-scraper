// api/scrape-conditions.js
export default async function handler(req, res) {
  try {
    // Dein aktueller Code hier (fetch, parse, supabase.upsert usw.)
    // z. B.:
    const steamRes = await fetch('https://steamplayerstats.com/games/arc-raiders');
    const steamText = await steamRes.text();
    const match = steamText.match(/Current Players<\/span>:\s*([\d,]+)/i);
    const steamPlayers = match ? parseInt(match[1].replace(/,/g, '')) : 0;
    const estimatedTotal = Math.round(steamPlayers * 2 / 1000) * 1000;

    // Supabase schreiben
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    await supabase.from('live_stats').upsert({
      id: 'players',
      total_estimated: estimatedTotal,
      steam_current: steamPlayers,
      last_updated: new Date().toISOString()
    });

    res.status(200).json({ success: true, estimated_total: estimatedTotal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Scraper failed', details: error.message });
  }
}
