
import { runMigrations, rollbackLastMigration } from "./runner.js";
import { sequelize } from "../config/database.js";

async function main(): Promise<void> {
  try {
    const command = process.argv[2] || "up";

    if (command === "up") {
      await runMigrations();
      console.log("[cli]: Migration process completed successfully.");
    } else if (command === "down") {
      await rollbackLastMigration();
      console.log("[cli]: Rollback process completed successfully.");
    } else {
      throw new Error(`[cli]: Unknown migration command: ${command}`);
    }
  } catch (error) {
    console.error("[cli]: Migration process failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
      console.log("[cli]: Database connection closed.");
    } catch (closeError) {
      console.error("[cli]: Error closing database connection:", closeError);
      process.exitCode = 1;
    }
  }
}

main();
