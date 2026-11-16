
import { DataTypes, type QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('payments', 'payment_url', {
    type: DataTypes.STRING(1000),
    allowNull: true,
  });

  await queryInterface.addColumn('payments', 'expires_at', {
    type: DataTypes.DATE,
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('payments', 'expires_at');
  await queryInterface.removeColumn('payments', 'payment_url');
}
