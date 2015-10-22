'use strict';
/**
	* Created by a.murin on 21/10/15.
	*/

module.exports = (app) => {

	var childProcess = require('child_process');

	var CP = class CP {

		constructor(opts) {

			var that = this;
			if (!(that instanceof CP))
				return new CP(opts);

			if (typeof opts === 'string')
				opts = {cmd: opts};

			if (opts.separator)
				that.separatorRe = new RegExp(RegExp.escape(opts.separator));

			that.opts = opts;
			that.defers = [];
			that.data = '';

			var title = opts.cmd;

			var cp = that.cp = childProcess.spawn(opts.cmd, opts.args, opts.options);
			cp.on('error', (err) => {

				log.error(`Child process ${title} error: ${utils.errOrStack(err)}`);
			});

			var common = (name) => cp.on(name, () => log.info(`Child process ${title} event ${name}`));

			'exit close disconnect'
				.split(/\s+/)
				.forEach((name) => common(name));

			cp.stderr.on('data', (data) => {

				var that = this;

				var msg = data.toString();
				if (msg.match(/bash.+no.+job.+control/i))
					return;

				if (that.ignoreError) {

					delete that.ignoreError;
					return;
				}

				log.warn(`Child process ${title} stderr: ${data}`);
				that.onData(data);
			});

			cp.stdout.on('data', (data) => {

				var that = this;

				log(`Child process ${title} stdout: ${data}`);

				that.onData(data);
			});

			if (opts.preSend) {

				that.ignoreError = true;
				that.cp.stdin.write(opts.preSend + (that.opts.sendCR ? '\n' : ''));
			}
		}

		onData(data) {

			var that = this;

			data = data.toString();
			if (that.separatorRe) {

				that.data += data;
				if (!that.data.match(that.separatorRe))
					return;

				var parts = that.data.split(that.separatorRe);
				that.data = parts.slice(1).join(that.opts.separator);
				data = parts[0];
			}

			var defer = that.defers.shift();
			if (defer)
				defer.resolve(data);
		}

		send(cmd) {

			var that = this;

			var defer = RSVP.defer();
			that.defers.push(defer);

			that.cp.stdin.write(cmd + (that.opts.sendCR ? '\n' : ''));
			log(`Write to child process ${that.opts.cmd}: ${cmd}`);

			return defer.promise;
		}
	};

	app.CP = CP;
};