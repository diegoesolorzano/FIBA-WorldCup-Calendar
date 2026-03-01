import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAllGames, filterByTeam } from "./scraper.js";
import { generateICS } from "./ics.js";
import { TEAMS } from "./teams.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const CALENDARS_DIR = join(ROOT_DIR, "calendars");

async function main() {
  console.log("Fetching games from FIBA...");
  const allGames = await fetchAllGames();
  console.log(`Found ${allGames.length} total games`);

  mkdirSync(CALENDARS_DIR, { recursive: true });

  // Generate .ics per team
  for (const team of TEAMS) {
    const games = filterByTeam(allGames, team.code);
    console.log(`${team.code} (${team.name}): ${games.length} games`);

    const ics = generateICS(games, team.code, team.name);
    const filePath = join(CALENDARS_DIR, `${team.code.toLowerCase()}.ics`);
    writeFileSync(filePath, ics, "utf-8");
  }

  // Generate data.json for the landing page
  const data = {
    updatedAt: new Date().toISOString(),
    teams: TEAMS,
    games: allGames,
  };
  writeFileSync(join(ROOT_DIR, "data.json"), JSON.stringify(data), "utf-8");
  console.log(`Generated ${TEAMS.length} calendars + data.json`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
