
import { DataTypes, type QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('payments', 'pidx', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.addIndex('payments', ['pidx'], {
    unique: true,
    name: 'payments_pidx_unique',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('payments', 'payments_pidx_unique');
  await queryInterface.removeColumn('payments', 'pidx');
}
