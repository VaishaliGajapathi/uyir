import { exec } from "./db.js";

export async function main() {
  console.log("[seed] seeding not implemented without Prisma");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
