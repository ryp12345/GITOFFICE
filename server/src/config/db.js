const { Pool } = require('pg');
const { URL } = require('url');
const {
	databaseUrl,
	dbHost,
	dbPort,
	dbName,
	dbUser,
	dbPass
} = require('./index');
function buildPoolConfig() {
	if (databaseUrl) {
		const connectionString = String(databaseUrl).trim();
		try {
			const parsed = new URL(connectionString);
			if (!parsed.password && dbPass) parsed.password = String(dbPass);
			return { connectionString: parsed.toString() };
		} catch (e) {
			return { connectionString };
		}
	}

	const cfg = {
		host: dbHost,
		port: dbPort,
		database: dbName,
		user: dbUser
	};

	if (dbPass !== undefined && dbPass !== null) cfg.password = String(dbPass);

	return cfg;
}

const pool = new Pool(buildPoolConfig());

module.exports = { pool };
