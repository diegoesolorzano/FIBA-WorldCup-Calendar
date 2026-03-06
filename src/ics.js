/**
 * Generates an .ics calendar string from an array of games for a given team.
 */
export function generateICS(games, teamCode, teamName) {
  const code = teamCode.toUpperCase();
  const now = formatDateUTC(new Date());

  const events = games.map((g) => buildEvent(g, code)).join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FIBA-WorldCup-Calendar//v1.0//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${teamName} - FIBA WC 2027 Qualifiers`,
    `X-WR-CALDESC:Calendario de ${teamName} en las Clasificatorias FIBA al Mundial 2027 (Americas)`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
    events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function buildEvent(game, teamCode) {
  const isHome = game.teamACode === teamCode;
  const opponent = isHome ? game.teamBCode : game.teamACode;
  const opponentName = isHome ? game.teamBName : game.teamAName;
  const homeAway = isHome ? "vs" : "@";

  // Parse date
  const dtStart = parseGameDate(game.dateTimeUTC || game.dateTime);
  // Basketball games are ~2.5 hours
  const dtEnd = new Date(dtStart.getTime() + 2.5 * 60 * 60 * 1000);

  const summary = `${teamCode} ${homeAway} ${opponent}`;

  const descParts = [
    `FIBA Basketball World Cup 2027 Americas Qualifiers`,
    `Group ${game.group} - ${game.roundName}`,
    `${game.window} (${game.gameSystem})`,
    "",
    `${game.teamAName} vs ${game.teamBName}`,
  ];

  if (game.status === "VALID") {
    descParts.push(`Score: ${game.teamACode} ${game.scoreA} - ${game.scoreB} ${game.teamBCode}`);
  }

  if (game.venue) {
    descParts.push(`Venue: ${game.venue}`);
  }

  const location = [game.venue, game.city, game.countryCode]
    .filter(Boolean)
    .join(", ");

  const status = game.status === "VALID" ? "CONFIRMED" : "TENTATIVE";

  return [
    "BEGIN:VEVENT",
    `UID:fiba-wcq-am-${game.id}@fiba-worldcup-calendar`,
    `DTSTAMP:${formatDateUTC(new Date())}`,
    `DTSTART:${formatDateUTC(dtStart)}`,
    `DTEND:${formatDateUTC(dtEnd)}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(descParts.join("\\n"))}`,
    location ? `LOCATION:${escapeICS(location)}` : null,
    `STATUS:${status}`,
    `CATEGORIES:Basketball,FIBA,World Cup Qualifiers`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeICS(summary)} starts in 30 minutes`,
    "END:VALARM",
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function parseGameDate(dateStr) {
  if (!dateStr) return new Date();
  // Format: "2025-11-27T20:40:00" — treat as UTC if it came from gameDateTimeUTC
  return new Date(dateStr + (dateStr.endsWith("Z") ? "" : "Z"));
}

function formatDateUTC(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICS(str) {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");
}
