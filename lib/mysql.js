'use strict';
/**
	* Created by a.murin on 19.10.2015.
	*/

module.exports = (app) => {

	var mysql = require('mysql');

	var config = utils.getConf(module);

	var mysqlDb = app.mysql = Object.create(process.EventEmitter.prototype);

	var connection = global.connection = mysql.createConnection(config);

	utils
	connection.connect();

	//Sync(function () {
	//
	//	var connect2db = function (host, dbName) {
	//
	//		log.info('Connect to Mysql.' + dbName);
	//		mysqlDb[dbName] = mysql.createConnection({
	//			host: host,
	//			user: config.user,
	//			password: config.password,
	//			database: dbName
	//		});
	//
	//		mysqlDb[dbName].connect.sync(mysqlDb[dbName]);
	//
	//		log.info('Mysql DB connected:', dbName);
	//	}.async();
	//
	//	var futures = [];
	//
	//	log.info('Connect to Mysql DBs..');
	//	log.profile('Connect to Mysql DBs done');
	//
	//	// Готовим к запуску
	//	_.each(config.databases, function (host, dbName) {
	//		futures.push(connect2db.future(null, host, dbName));
	//	});
	//
	//	// Запускаем параллельно и ждем, пока все не завершатся
	//	_.each(futures, function (future) {
	//		future.yield();
	//	});
	//
	//	log.profile('Connect to Mysql DBs done');
	//
	//
	//}, function (err) {
	//	if (err)
	//		generateError(err);
	//
	//	process.nextTick(function () {app.emit('ready')});
	//	process.nextTick(function () {app.mysql.emit('ready')});
	//});
	//
	//function generateError(err) {
	//	log.error(err.toString());
	//	app.shutDown(true);
	//}

};