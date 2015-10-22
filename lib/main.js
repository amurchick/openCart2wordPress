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

	log(`Booting App version: ${app.version}...`);


	app.conf = require('../config.js');
	try {

		utils.extend(app.conf, require('../private.js'));
	} catch (e) {}

	require('./mysql')(app);
	require('./cp')(app);

	app.start = () => {

		RSVP
			.Promise
			.all(app.ready)
			.then(() => {

				log('App started.');
				return app.doIt();
			})
			.then(() => utils.shutdown())
			.catch(utils.catch());
	};

	app.doIt = () => {

		var bash = new app.CP({cmd: 'bash', args: ['-i', '-s'], sendCR: true, preSend: 'PS1=#EOF#', separator: '#EOF#'});
		//var bash = new app.CP({cmd: 'bash', sendCR: true});

		return co(function *() {

			var p = app.conf.tablesPrefix;
			var res = yield db.query(`
				SELECT
					${p}category.category_id AS id,
					${p}category.parent_id AS parent,
					${p}category_description.name AS name
				FROM
					${p}category,
					${p}category_description
				WHERE
					${p}category.category_id = ${p}category_description.category_id AND
					${p}category_description.language_id = 1
				ORDER BY
					parent, id
			`);

			var cats = [];
			res[0].forEach((item) => {

				cats.push({
					id: item.id,
					parent: item.parent,
					name: item.name
				});
			});

			log(`Readed ${cats.length} categories`);

			res = yield db.query(`
				SELECT
					${p}product_image.product_id AS product,
					${p}product_image.image AS image
				FROM
					${p}product_image
			`);

			var images = [];
			res[0].forEach((item) => {

				images.push({
					product: item.product,
					image: item.image
				});
			});

			res = yield db.query(`
				SELECT
					${p}product.product_id AS id,
					${p}product_description.name AS name,
					${p}product.image AS image,
					${p}product_to_category.category_id AS category,
					${p}product_description.description AS html
				FROM
					${p}product,
					${p}product_description,
					${p}product_to_category
				WHERE
					${p}product.product_id = ${p}product_description.product_id AND
					${p}product_description.language_id = 1 AND
					${p}product.product_id = ${p}product_to_category.product_id
				ORDER BY
				category, name
			`);

			var pages = [];
			var promises = [];

			yield bash.send(`rm -Rf ${app.conf.tempPath}`);
			fs.mkdirSync(app.conf.tempPath);

			res[0].forEach((item) => {

				var page = {
					id: item.id,
					name: item.name,
					image: item.image,
					images: images.filterBy({product: item.id}),
					category: item.category,
					html: utils.convertAmp(item.html)
				};

				pages.push(page);

				fs.mkdirSync(`${app.conf.tempPath}/${page.id}`);
				promises.push(
					fs.writeFile(`${app.conf.tempPath}/${page.id}/content.html`)
				);
			});

			log(`Readed ${pages.length} pages`);

			return RSVP
				.all(promises)
				.then(() => pages);

		})
			.then((pages) => {

				log(`Pages data writed.`);
			})
			.catch(utils.catch());
	};

	return app;
};
