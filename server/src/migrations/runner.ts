import { Sequelize, QueryTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { migrations } from "./index.js";
import { ensureMetaTable } from "./meta.js";

// Retrieve migration names already recorded in SequelizeMeta.
export async function getExecutedMigrations(
  sequelizeInstance: Sequelize
): Promise<string[]> {
  const results = await sequelizeInstance.query<{ name: string }>(
    "SELECT name FROM SequelizeMeta ORDER BY executed_at ASC;",
    { type: QueryTypes.SELECT }
  );

  return results.map((row) => row.name);
}

// Execute all pending migrations.
export async function runMigrations(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();

  // 1. Ensure migration history table exists.
  await ensureMetaTable(queryInterface);

  // 2. Retrieve executed migration names.
  const executedMigrations = await getExecutedMigrations(sequelize);

  // 3. Validate that every executed migration exists in the registry.
  const registeredNames = new Set(
    migrations.map((migration) => migration.name)
  );

  const missingMigrations = executedMigrations.filter(
    (name) => !registeredNames.has(name)
  );

  if (missingMigrations.length > 0) {
    throw new Error(
      `[migrations]: Previously executed migrations are missing from the registry: ${missingMigrations.join(", ")}`
    );
  }

  // 4. Find migrations that haven't executed yet.
  const executedNames = new Set(executedMigrations);

  const pendingMigrations = migrations.filter(
    (migration) => !executedNames.has(migration.name)
  );

  if (pendingMigrations.length === 0) {
    console.log(
      "[migrations]: No pending migrations found. Database is up to date."
    );
    return;
  }

  console.log(
    `[migrations]: Found ${pendingMigrations.length} pending migration(s). Running...`
  );

  // 5. Execute pending migrations sequentially.
  for (const migration of pendingMigrations) {
    console.log(`[migrations]: Executing -> ${migration.name}`);

    try {
      // Execute the schema changes.
      await migration.up(queryInterface);

      // Record migration only after successful execution.
      await queryInterface.bulkInsert("SequelizeMeta", [
        {
          name: migration.name,
          executed_at: new Date(),
        },
      ]);

      console.log(`[migrations]: Completed -> ${migration.name}`);
    } catch (error) {
      console.error(
        `[migrations]: Failed to execute -> ${migration.name}`,
        error
      );

      throw error;
    }
  }

  console.log(
    "[migrations]: All pending migrations executed successfully."
  );
}

// Rollback the last executed migration.

export async function rollbackLastMigration(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();

  // 1. Ensure metadata table exists.
  await ensureMetaTable(queryInterface);

  // 2. Retrieve executed migrations.
  const executedMigrations = await getExecutedMigrations(sequelize);

  if (executedMigrations.length === 0) {
    console.log("[migrations]: No executed migrations found to rollback.");
    return;
  }

  // 3. Validate migration registry.
  const registeredNames = new Set(
    migrations.map((migration) => migration.name)
  );

  const missingMigrations = executedMigrations.filter(
    (name) => !registeredNames.has(name)
  );

  if (missingMigrations.length > 0) {
    throw new Error(
      `[migrations]: Cannot rollback. Missing migrations: ${missingMigrations.join(", ")}`
    );
  }

  // 4. Find the latest executed migration.
  const executedSet = new Set(executedMigrations);

  const targetMigration = [...migrations]
    .reverse()
    .find((migration) => executedSet.has(migration.name));

  if (!targetMigration) {
    throw new Error(
      "[migrations]: Could not identify the latest executed migration."
    );
  }

  console.log(
    `[migrations]: Rolling back -> ${targetMigration.name}`
  );

  try {
    // 5. Execute rollback.
    await targetMigration.down(queryInterface);

    // 6. Remove history only after successful rollback.
    await queryInterface.bulkDelete("SequelizeMeta", {
      name: targetMigration.name,
    });

    console.log(
      `[migrations]: Successfully rolled back -> ${targetMigration.name}`
    );
  } catch (error) {
    console.error(
      `[migrations]: Failed to rollback -> ${targetMigration.name}`,
      error
    );

    throw error;
  }
}
