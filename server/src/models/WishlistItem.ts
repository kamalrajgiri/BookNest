import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';

import { sequelize } from '../config/database.js';

class WishlistItem extends Model<
  InferAttributes<WishlistItem>,
  InferCreationAttributes<WishlistItem>
> {
  declare id: CreationOptional<number>;
  declare wishlistId: number;
  declare bookId: number;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

WishlistItem.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    wishlistId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'wishlist_id',
    },

    bookId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'book_id',
    },

    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'wishlist_items',
    timestamps: true,
    underscored: true,
  }
);

export default WishlistItem;