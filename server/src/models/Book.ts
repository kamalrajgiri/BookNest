import {
    DataTypes,
    Model,
    type InferAttributes,
    type InferCreationAttributes,
    type CreationOptional,
} from 'sequelize';
import { sequelize } from '../config/database.js';

class Book extends Model<InferAttributes<Book>, InferCreationAttributes<Book>> {
    declare id: CreationOptional<number>;

    declare title: string;
    declare author: string;
    declare description: CreationOptional<string | null>;

    declare price: string;

    declare stock: CreationOptional<number>;
    declare rating: CreationOptional<string | null>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;  
    declare deletedAt: CreationOptional<Date | null>;
}

Book.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        author: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        description:{
            type: DataTypes.TEXT,
            allowNull: true,
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                            min: 0.01,
            },
        },
        stock: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
        },
        rating: {
            type: DataTypes.DECIMAL(2, 1),
            allowNull: true,
            validate: {
                min: 0,
                max: 5,
            },
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE,
    },
    {
        sequelize,
        tableName: 'books',
        timestamps: true,
        paranoid: true,
        underscored: true,
    }
);

export default Book;