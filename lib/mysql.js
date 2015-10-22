'use strict';
/**
	* Created by a.murin on 19.10.2015.
	*/

module.exports = (app) => {

	var mysql = require('mysql');

	var config = utils.getConf(module);

	var mysqlDb = app.mysql = Object.create(process.EventEmitter.prototype);

	var db = global.db = mysql.createConnection(config);

	// Convert Callback functions to Promise
	'connect end query'
		.split(/\s+/)
		.forEach(function (name) {

			db[name] = utils.promiseable(db[name], db);
		});

	utils.on('preshutdown', (promises) => {

		log('Close Mysql DB connection...');
		promises.push(
			db
				.end()
				.then(() => log('Mysql DB connection closed.'))
				.catch(utils.catch())
		);
	});

	log('Connect to Mysql DB...');

	var promise = db.connect();
	app.ready.push(promise);

	promise
		.then(() => log('Mysql DB connected'))
		.catch((err) => {

			log.error('Failed to connect to Mysql DB:', utils.errOrStack(err));
			utils.shutdown(-1);
		});

};