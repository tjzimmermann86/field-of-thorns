// Shared ranking for Field of Thorns on Vercel.
// Needs an Upstash Redis (Vercel Marketplace) store connected to the project; it provides
// KV_REST_API_URL / KV_REST_API_TOKEN (older setups: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY_RE = /^(d[0-4]m[0-3]|story)$/;
const ID_RE = /^[a-z0-9]{8,32}$/;

async function redis(commands) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).map(x => x.result);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) return res.status(503).json({ error: "Ranking storage is not connected yet." });
  try {
    if (req.method === "GET") {
      const key = String(req.query.key || "");
      if (!KEY_RE.test(key)) return res.status(400).json({ error: "Unknown ranking." });
      const [ids] = await redis([["ZRANGE", `fot:lb:${key}`, 0, 19, "REV"]]);
      if (!ids || !ids.length) return res.json({ entries: [] });
      const [rows] = await redis([["HMGET", `fot:entry:${key}`, ...ids]]);
      const entries = ids.map((id, i) => ({ id, ...(rows[i] ? JSON.parse(rows[i]) : {}) })).filter(e => typeof e.score === "number");
      return res.json({ entries });
    }
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const key = String(b.key || ""), id = String(b.id || ""), score = Math.round(Number(b.score));
      if (!KEY_RE.test(key) || !ID_RE.test(id) || !Number.isFinite(score) || score < 0 || score > 1e8) return res.status(400).json({ error: "Invalid score." });
      const name = String(b.name || "").replace(/[^\p{L}\p{N} _.\-']/gu, "").trim().slice(0, 20) || "Thornwarden";
      const entry = { name, score, win: !!b.win, round: Math.max(0, Math.min(99, Number(b.round) | 0)), time: Math.max(0, Number(b.time) | 0), at: Date.now() };
      const [prev] = await redis([["ZSCORE", `fot:lb:${key}`, id]]);
      if (prev !== null && Number(prev) >= score) { // keep the best run, but let a renamed player update their name
        const [old] = await redis([["HGET", `fot:entry:${key}`, id]]);
        if (old) await redis([["HSET", `fot:entry:${key}`, id, JSON.stringify({ ...JSON.parse(old), name })]]);
        return res.json({ ok: true, best: Number(prev) });
      }
      await redis([["ZADD", `fot:lb:${key}`, score, id], ["HSET", `fot:entry:${key}`, id, JSON.stringify(entry)]]);
      return res.json({ ok: true, best: score });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (e) {
    return res.status(500).json({ error: "Ranking is unavailable right now." });
  }
};
