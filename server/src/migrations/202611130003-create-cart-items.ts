import { DataTypes, Op, type QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('cart_items', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    cart_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'carts',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    book_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'books',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Add composite unique constraint so a book cannot be duplicated inside the same cart
  await queryInterface.addConstraint('cart_items', {
    fields: ['cart_id', 'book_id'],
    type: 'unique',
    name: 'cart_items_cart_id_book_id_unique',
  });

  // Add check constraint to ensure quantity is strictly greater than 0
  await queryInterface.addConstraint('cart_items', {
    fields: ['quantity'],
    type: 'check',
    where: {
      quantity: {
        [Op.gt]: 0,
      },
    },
    name: 'cart_items_quantity_chk',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('cart_items');
}