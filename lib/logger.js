'use strict';
/**
	* Created by a.murin on 19.10.15.
	*/

var getFileAndLine = function (depth) {

	depth = 3;
	var stack = null;

	try {
		depth = b;
	}
	catch (e) {

		stack = e.stack.split(/\n/);
		stack = stack && stack.length && typeof stack[depth] === 'string' ? stack[depth] : null;
	}

	stack = stack.split(/\s+/).pop().split(/\//).pop().replace(/[()]+/g, '');
	if (1)
		stack = stack.split(':').slice(0,2).join(':');

	return stack;
};

module.exports = function (module) {

	var makeFunc = (name) => {

		return function () {

			var args = Array.prototype.slice.call(arguments);

			var first = args[0];
			var date = new Date();
			date = utils && utils.convertDateToPrintable ? utils.convertDateToPrintable(date) : date.toISOString();
			var newFirst = `${name}: [${date} ${getFileAndLine()}]`;

			if (typeof first === 'string')
				args[0] = newFirst + ' ' + first;
			else
				args.unshift(newFirst);

			return console[name].apply(this, args);
		};
	};

	var log = makeFunc('log');

	['info', 'debug', 'error', 'warn'].forEach((name) => {

		log[name] = makeFunc(name);
	});

	return log;
};
