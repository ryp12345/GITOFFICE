const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

// Prefer app config (DATABASE_URL or DB_* env vars) to connect to Postgres.
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
  // fallback to sqlite for local/dev when no DB config provided
  const storage = process.env.SQLITE_STORAGE || 'server_dev.sqlite';
  sequelize = new Sequelize({ dialect: 'sqlite', storage, logging: false });
}

const db = {};

// Import models in this directory
fs.readdirSync(__dirname)
  .filter((file) => file.indexOf('.') !== 0 && file !== 'index.js')
  .forEach((file) => {
    const mod = require(path.join(__dirname, file));
    // Support both Sequelize-style model definition functions and
    // modules that export plain objects/functions (non-sequelize models).
    if (mod && typeof mod === 'function') {
      const model = mod(sequelize, DataTypes);
      if (model && model.name) db[model.name] = model;
    } else if (mod && typeof mod.default === 'function') {
      // support transpiled ES module default export
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
