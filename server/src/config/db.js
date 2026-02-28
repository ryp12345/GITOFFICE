const { Pool } = require('pg');
const {
	databaseUrl,
	dbHost,
	dbPort,
	dbName,
	dbUser,
	dbPass
} = require('./index');

const pool = databaseUrl
	? new Pool({ connectionString: databaseUrl })
	: new Pool({
			host: dbHost,
			port: dbPort,
			database: dbName,
			user: dbUser,
			password: dbPass
		});

module.exports = { pool };
