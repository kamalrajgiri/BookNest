import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';

import { sequelize } from '../config/database.js';

export type PaymentProvider = 'khalti';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

class Payment extends Model<
  InferAttributes<Payment>,
  InferCreationAttributes<Payment>
> {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare amount: string;
  declare provider: CreationOptional<PaymentProvider>;
  declare pidx: CreationOptional<string | null>;
  declare transactionId: CreationOptional<string | null>;
  declare status: CreationOptional<PaymentStatus>;
  declare paymentUrl: CreationOptional<string | null>;
declare expiresAt: CreationOptional<Date | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Payment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    orderId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
      field: 'order_id',
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    provider: {
      type: DataTypes.ENUM('khalti'),
      allowNull: false,
      defaultValue: 'khalti',
    },

    transactionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'transaction_id',
    },

    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },

    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
    pidx: {
  type: DataTypes.STRING(255),
  allowNull: true,
  unique: true,
},
paymentUrl: {
  type: DataTypes.STRING(1000),
  allowNull: true,
  field: 'payment_url',
},

expiresAt: {
  type: DataTypes.DATE,
  allowNull: true,
  field: 'expires_at',
},
  },
  {
    sequelize,
    tableName: 'payments',
    timestamps: true,
    underscored: true,
  },
  
);

export default Payment;