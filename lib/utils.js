'use strict';
/**
	* Created by a.murin on 17/07/15.
	*/

module.exports = function (app) {

	global.log = require('./logger')(app);
	global.RSVP = require('rsvp');
	global.co = require('co');
	global.fs = require('fs');
	global.crypto = require('crypto');
	global.util = require('util');
	global.os = require('os');
	global._ = require('lodash');

	var utils = global.utils = Object.create(process.EventEmitter.prototype);
	utils.isMac = os.platform().match(/darwin/);

	var log = require('./logger')(module);
	var trace = require('debug')('utils');

	RSVP.on('error', function (err) {

		log.error('RSVP.onError:', err);
	});

	utils.getConf = function (module) {

		module.name = module.filename.replace(/^.+\/([^\/.]+)\.\w+$/, '$1');
		return app.conf[module.name];
	};

	utils.catch = function (opts) {

		opts = opts || {};

		try {
			opts = b;
		}
		catch (e) {

			opts.stack = e.stack.split(/\n/);
			opts.stack = opts.stack && opts.stack.length && utils.isString(opts.stack[2]) ? opts.stack[2] : null;
		}

		return function (err) {

			err = '%s%s'.format(
								err && err.stack ? err.stack : err,
								opts.stack ? '\n' + opts.stack : ''
							);

			if (opts.fatal)
				throw err;
			else
				log.error(err);
		};
	};

	utils.noop = function () {};

	utils.delay = function (ms) {

		var opts = utils.isObject(ms) ? ms : {delay: ms};

		var defer = RSVP.defer();

		opts.timeout = setTimeout(function () {

			defer.resolve();
		}, opts.delay);

		opts.cancel = function () {

			clearTimeout(opts.timeout);
			defer.resolve();
		};

		return opts.promise ? RSVP.all([defer.promise, opts.promise]) : defer.promise;
	};

	utils.getRandom = function (opts) {

		opts = opts || {};
		return Math.trunc(Math.random() * (opts.max || 100000)) + (opts.add || 1);
	};

	utils.isArray = Array.isArray;

	utils.isObject = function (o) {

		return typeof o === 'object' && !utils.isArray(o);
	};

	utils.isString = function (o) {

		return typeof o === 'string';
	};

	utils.isUndefined = function (o) {

		return typeof o === 'undefined';
	};

	utils.isDefined = function (o) {

		return typeof o !== 'undefined';
	};

	utils.isBoolean = function (o) {

		return typeof o === 'boolean';
	};

	utils.isDate = function (o) {

		return utils.isObject(o) && utils.isFunction(o.getTimezoneOffset);
	};

	utils.isFunction = function (o) {

		return typeof o === 'function';
	};

	utils.toArray = function (o) {

		return utils.isArray(o) ? o : [o];
	};

	Object.forEach = function (obj, fn) {

		if (!utils.isObject(obj))
			throw new Error('Object.forEach(): first argument must be {}!');

		if (!utils.isFunction(fn))
			throw new Error('Object.forEach(): second argument must be function!');

		Object.keys(obj).forEach(function (key) {

			fn(key, obj[key]);
		});

		return obj;
	};

	utils.guid = function(opts) {

		opts = opts || {};

		var id = "", i, random;

		for (i = 0; i < (opts.count ? opts.count : 32); i++) {

			random = Math.random() * 16 | 0;

			if (!opts.count && (i == 8 || i == 12 || i == 16 || i == 20)) {
				id += "-";
			}

			id += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
		}

		return id;
	};

	utils.uid = function (opts) {

		opts = opts || {};

		opts.count = opts.count || 16;

		return crypto.randomBytes(opts.count).toString(opts.encoding || 'hex');
	};

	// Сгенерировать простое к вводу число - 4 знака (два числа по 2 знака),
	// причем в каждой паре есть одна цифра, что есть и в другой паре, например, 7876 или 2838
	utils.generateCheckCode = function () {

		var digits = new Array(4).join(',').split(',').map(function () {

			return Math.floor(Math.random()*9 + 1);
		});

		var sameDigitIndex = Math.floor(Math.random()*2);
		digits[sameDigitIndex] = digits[sameDigitIndex + 2];

		return digits.join('');
	};

	utils.extend = _.extend;

	utils.toTwoDigits = function (num) {

		return (num < 10 ? '0' : '') + num.toString();
	};

	utils.sha256 = function (str, opts) {

		opts = opts || {};
		var hash = crypto.createHash('sha256');
		hash.update(str);

		hash = hash.digest(opts.encoding || 'hex');

		if (opts.count)
			hash = hash.slice(0, opts.count);

		if (opts.toUpperCase)
			hash = hash.toUpperCase();

		return hash;
	};

	utils.md5 = function (str) {

		var hash = crypto.createHash('md5');
		hash.update(str);

		return hash.digest('hex');
	};

	utils.convertDateToPrintable = function (date) {

		return date.toJSON().replace(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).+$/, '$1-$2-$3 $4:$5:$6');
	};

	Array.prototype.filterBy = function (cond) {

		return _.filter(this, cond);
	};

	Array.prototype.findBy = function (cond) {

		var res = this.filterBy(cond);

		return res.length ? res[0] : null;
	};

	Array.prototype.rejectBy = function (cond) {

		return this.length ? (utils.isObject(this[0]) ? _.reject(this, cond) : _.without(this, cond)) : this;
	};

	Array.prototype.mapBy = function (key) {

		return _.map(this, key);
	};

	Array.prototype.removeBy = function (fn) {

		return _.remove(this, fn);
	};

	Array.prototype.setBy = function (o) {

		this.forEach(function (item) {

			_.extend(item, o);
		});
		return this;
	};

	Array.prototype.contains = function (item) {

		return this.indexOf(item) > -1;
	};

	Array.prototype.min = function (key) {

		var res = _.min(this, key);

		return res !== Infinity ? res : null;
	};

	Array.prototype.toObject = function (key) {

		key = key || '_id';
		var out = {};

		this.forEach(function (item) {

			var id = item[key];
			if (id)
				// id.id - для ObjectId
				out[id.id ? id.id : id] = item;
		});

		return out;
	};

	var camelizeRe = /(\-|_|\.|\s)+(.)?/g;
	var camelizeRe1 = /^[A-Z]/;
	String.prototype.camelize = function () {

		return this
			.replace(camelizeRe, function (match, separator, chr) {

				return chr ? chr.toUpperCase() : '';
			})
			.replace(camelizeRe1, function (match) {

				return match.toLowerCase();
			});
	};

	var decamelizeRe = /([a-z\d])([A-Z])/g;
	String.prototype.decamelize = function () {

		return this.replace(decamelizeRe, "$1_$2").toLowerCase();
	};

	// callback()-стиль в promise-стиль (нормальный вариант - cb(err, result)
	utils.promiseable = function (func, thisp /* extra args */) {

		var baseArgs = [].slice.call(arguments, 2);

		return function () {

			var args = baseArgs.concat([].slice.call(arguments));

			return new RSVP.Promise(function (resolve, reject) {

				args.push(function (err/*, results */) {

					if (err)
						return reject(err);

					// Отрезаем первый аргумент
					var result = baseArgs.concat([].slice.call(arguments, 1));

					// Для sqlite - run() может возвратить changes и lastID
					if (utils.isUndefined(result[0])) {

						if (!utils.isUndefined(this.changes) || !utils.isUndefined(this.lastID)) {

							trace('Last db.run: changes = %s, lastID = %s'.format(this.changes, this.lastID));
							result[0] = this;
						}
					}

					// Если один result - его вернем, иначе массив result'ов
					resolve(result.length > 1 ? result : result[0]);
				});

				func.apply(thisp, args);
			});
		};
	};

	// callback()-стиль в promise-стиль (корявый вариант - cb(result)
	utils.promiseableNoError = function (func, thisp /* extra args */) {

		var baseArgs = [].slice.call(arguments, 2);

		return function () {

			var args = baseArgs.concat([].slice.call(arguments));

			return new RSVP.Promise(function (resolve, reject) {

				args.push(resolve);
				func.apply(thisp, args);
			});
		};
	};


	// Вызывается при process.exit
	utils.shutdown = function (val) {

		if (utils.inShutdown)
			return;

		val = val || 0;
		utils.inShutdown = true;
		log.info('App pre-shutdown...');

		// Если не завершились за 10 секунд - принудительно выходим
		setTimeout(function () {

			log.info('App forced to exit.');
			process.exit(val || 0);
		}, 10000);

		var promises = [];
		utils.emit('preshutdown', promises);

		RSVP.Promise
			.all(promises)
			.then(function () {

				log.info('App shutdown...');
				promises = [];
				utils.emit('shutdown', promises);

				return RSVP.Promise
					.all(promises)
					.catch(utils.catch())
					.then(function () {

						log.info('App exited.');
						process.exit(val || 0);
					});
			})
			.catch(utils.catch());

	};

	// Хандлеры на выход
	process.on('SIGINT', function() {

		log.info('SIGINT');
		utils.shutdown();
	});
	process.on('SIGTERM', function() {

		log.info('SIGTERM');
		utils.shutdown();
	});

	process.on('exit', function(code) {

		if (!utils.inShutdown) {

			log.info('exit(%s) called', code);
			utils.shutdown(code);
		}
	});

	process.on('uncaughtException', function (err) {

		log.error('uncaughtException', err && err.stack ? err.stack : err);
	});


	/**
	 * Функции запуска функции по рассписанию, а так же вне рассписания
	 * Если функция уже запущена, то попытка запуска будет выполнена после отработки текущего запуска
	 */
	var scheduledFuncs = [];

	utils.runScheduled = function (id, data) {

		var o = scheduledFuncs.findBy({id: id});
		if (!o)
			return;

		if (o.isRun) {

			// Если еще не запланированно - запланируем, иначе просто вернем обещание предыдущего планирования
			if (!o.scheduled)
				o.scheduled = o.finish
					.promise
					.then(function () {

						return utils.runScheduled(id, data);
					});

			return o.scheduled;
		}

		o.isRun = true;
		o.finish = RSVP.defer();

		if (o.timeout)
			clearTimeout(o.timeout);

		return RSVP
			.resolve()
			.then(function () {

				return o.fn(data);
			})
			.catch(utils.catch())
			.then(function (res) {

				o.timeout = setTimeout(function () {

					utils.runScheduled(id);
				}, o.interval);

				o.isRun = false;
				o.finish.resolve();

				return res;
			})
			.catch(utils.catch());
	};

	utils.startScheduled = function (fn, interval, data) {

		var o = {
			id: utils.guid(),
			fn: fn,
			interval: interval
		};

		scheduledFuncs.push(o);

		process.nextTick(function () {

			utils.runScheduled(o.id, data);
		});

		return o.id;
	};

	utils.stopScheduled = function (id) {

		var o = scheduledFuncs.findBy({id: id});
		if (!o)
			return;

		if (o.timeout)
			clearTimeout(o.timeout);

		scheduledFuncs = scheduledFuncs.rejectBy({id: o.id});
	};

	return utils;
};