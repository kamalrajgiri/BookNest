
import { DataTypes, type QueryInterface } from "sequelize";

export async function ensureMetaTable(
  queryInterface: QueryInterface
): Promise<void> {
  const tableName = "SequelizeMeta";

  const tables = await queryInterface.showAllTables();
  const tableExists = tables.includes(tableName);

  if (!tableExists) {
    await queryInterface.createTable(tableName, {
      name: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
      },
      executed_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
  }
}
