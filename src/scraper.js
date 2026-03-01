const FIBA_URL =
  "https://www.fiba.basketball/es/events/fiba-basketball-world-cup-2027-americas-qualifiers/games";

/**
 * Fetches the FIBA qualifiers page and extracts all game data
 * from the embedded Next.js RSC payload (__next_f).
 */
export async function fetchAllGames() {
  const resp = await fetch(FIBA_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    },
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch FIBA page: ${resp.status}`);
  }

  const html = await resp.text();
  return parseGamesFromHtml(html);
}

/**
 * Parses the RSC payload from the page HTML to extract the games array.
 */
function parseGamesFromHtml(html) {
  // The RSC payload is inside <script> tags as: self.__next_f.push([1,"..."])
  // We need to find the chunk that contains the "games" array
  const chunks = [];
  const scriptRegex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    // Unescape the JSON string
    const raw = match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\t/g, "\t")
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
    chunks.push(raw);
  }

  // Find the chunk containing the games array
  const gamesChunk = chunks.find(
    (c) => c.includes('"games":[{') && c.includes('"gameId"')
  );

  if (!gamesChunk) {
    throw new Error(
      "Could not find games data in FIBA page. The page structure may have changed."
    );
  }

  // Extract the games JSON array
  const gamesStart = gamesChunk.indexOf('"games":[{');
  const arrayStart = gamesChunk.indexOf("[", gamesStart);
  let depth = 0;
  let i = arrayStart;

  for (; i < gamesChunk.length; i++) {
    if (gamesChunk[i] === "[") depth++;
    if (gamesChunk[i] === "]") depth--;
    if (depth === 0) break;
  }

  const gamesJson = gamesChunk.substring(arrayStart, i + 1);
  // Clean RSC date tokens like "$D2025-11-27..."
  const cleaned = gamesJson.replace(/"\$D([^"]+)"/g, '"$1"');

  const games = JSON.parse(cleaned);

  return games.map((g) => ({
    id: g.gameId,
    teamACode: g.teamA?.code,
    teamAName: g.teamA?.officialName,
    teamBCode: g.teamB?.code,
    teamBName: g.teamB?.officialName,
    scoreA: g.teamAScore,
    scoreB: g.teamBScore,
    dateTime: g.gameDateTime,
    dateTimeUTC: g.gameDateTimeUTC,
    timezone: g.ianaTimeZone,
    city: g.hostCity,
    countryCode: g.hostCountryCode,
    venue: g.venueName,
    status: g.statusCode, // VALID = played, INIT = upcoming
    group: g.groupPairingCode,
    roundName: g.round?.roundName,
    gameSystem: g.round?.gameSystem,
    window: g.windowName || g.windowCode,
    isLive: g.isLive,
  }));
}

/**
 * Filters games for a specific team.
 */
export function filterByTeam(games, teamCode) {
  const code = teamCode.toUpperCase();
  return games
    .filter((g) => g.teamACode === code || g.teamBCode === code)
    .sort((a, b) => (a.dateTime || "").localeCompare(b.dateTime || ""));
}
