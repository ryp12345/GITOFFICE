const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const appConfig = require('../config');
let sequelize;
if (appConfig.databaseUrl) {
  sequelize = new Sequelize(appConfig.databaseUrl, { logging: false });
} else if (appConfig.dbHost && appConfig.dbUser) {
  sequelize = new Sequelize(appConfig.dbName, appConfig.dbUser, appConfig.dbPass, {
    host: appConfig.dbHost,
    port: appConfig.dbPort,
    dialect: 'postgres',
    logging: false,
  });
} else {
  const storage = process.env.SQLITE_STORAGE || 'server_dev.sqlite';
  sequelize = new Sequelize({ dialect: 'sqlite', storage, logging: false });
}

const db = {};

// Import top-level model files only (skip subdirectories)
fs.readdirSync(__dirname)
  .filter((file) => {
    const fullPath = path.join(__dirname, file);
    return file.indexOf('.') !== 0 && file !== 'index.js' && fs.statSync(fullPath).isFile();
  })
  .forEach((file) => {
    const mod = require(path.join(__dirname, file));
    if (mod && typeof mod === 'function') {
      const model = mod(sequelize, DataTypes);
      if (model && model.name) db[model.name] = model;
    } else if (mod && typeof mod.default === 'function') {
      const model = mod.default(sequelize, DataTypes);
      if (model && model.name) db[model.name] = model;
    } else {
      const name = path.basename(file, path.extname(file));
      db[name] = mod;
    }
  });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
