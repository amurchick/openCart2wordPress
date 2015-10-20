'use strict';
/**
	* Created by a.murin on 17/10/15.
	*/

module.exports = function () {

	process.env.DEBUG = process.env.DEBUG || '*';
	process.env.DEBUG_FD = process.env.DEBUG_FD || '1';
	process.env.DEBUG_COLORS = 'yes';
	process.env.NODE_ENV = 'development';
	//process.env.NODE_ENV = 'production';

	var trace = require('debug')('main');

	var app = Object.create(process.EventEmitter.prototype);
	app.version = require('../package.json').version;
	app.ready = [];

	require('./utils')(app);

	app.conf = require('../config.js');
	try {

		utils.extend(app.conf, require('../private.js'));
	} catch (e) {}

	require('./mysql')(app);

	app.start = function () {

	};

	return app;
};
