import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAllGames, filterByTeam } from "./scraper.js";
import { generateICS } from "./ics.js";
import { TEAMS } from "./teams.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CALENDARS_DIR = join(__dirname, "..", "calendars");

async function main() {
  console.log("Fetching games from FIBA...");
  const allGames = await fetchAllGames();
  console.log(`Found ${allGames.length} total games`);

  mkdirSync(CALENDARS_DIR, { recursive: true });

  for (const team of TEAMS) {
    const games = filterByTeam(allGames, team.code);
    console.log(`${team.code} (${team.name}): ${games.length} games`);

    const ics = generateICS(games, team.code, team.name);
    const filePath = join(CALENDARS_DIR, `${team.code.toLowerCase()}.ics`);
    writeFileSync(filePath, ics, "utf-8");
    console.log(`  -> ${filePath}`);
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
