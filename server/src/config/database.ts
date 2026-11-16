import {Sequelize} from "sequelize";
import {config} from "./env.js";

export const sequelize = new Sequelize(
    config.database.name,
    config.database.user,
    config.database.password,
    {
        host: config.database.host,
        port: config.database.port,
        dialect: "mysql",

        pool:{
            max:10,
            min:0,
            acquire:30000,
            idle:10000,
        },
        logging: config.nodeEnv === 'development' ? console.log : false,
    }
);