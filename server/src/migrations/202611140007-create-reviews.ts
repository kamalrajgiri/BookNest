import { DataTypes, Op, type QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('reviews', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
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
    rating: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
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

  // Add unique composite constraint so a user can only review a specific book once
  await queryInterface.addConstraint('reviews', {
    fields: ['user_id', 'book_id'],
    type: 'unique',
    name: 'reviews_user_id_book_id_unique',
  });

  // Add check constraint to ensure rating is between 1 and 5 inclusive
  await queryInterface.addConstraint('reviews', {
    fields: ['rating'],
    type: 'check',
    where: {
      rating: {
        [Op.between]: [1, 5],
      },
    },
    name: 'reviews_rating_range_chk',
  });

  // Add an index on book_id for efficient retrieval of a book's reviews
  await queryInterface.addIndex('reviews', ['book_id'], {
    name: 'reviews_book_id_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('reviews');
}