'use strict';
/**
	* Created by a.murin on 17/10/15.
	*/

module.exports = function () {

	process.env.DEBUG = process.env.DEBUG || '-cp,*';
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

		var pages = [];
		var cats = [];

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

			res[0].forEach((item) => {

				var cat = {
					id: item.id,
					name: item.name,
					parent: item.parent,
					cats: [item.name]
				};

				if (item.parent) {

					var parent = cats.findBy({id: item.parent});
					cat.cats = cat.cats.concat(parent.cats);
					cat.cats.push(cat.cats.shift());
				}

				cats.push(cat);
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

			var promises = [];

			yield bash.send(`rm -Rf ${app.conf.tempPath}`);
			fs.mkdirSync(app.conf.tempPath);

			log('Write pages...');
			var path = `products`;
			fs.mkdirSync(`${app.conf.tempPath}/${path}`);

			var urlsRe = new RegExp(`(?:src|href)="?(?:https?:\/\/${RegExp.escape(app.conf.openCartDomain)}/)?([^">]+)[">]`, 'gim');
			res[0].forEach((item) => {

				var page = pages.findBy({id: item.id});
				if (page) {

					page.category.push(item.category);
				}
				else {

					item.name = utils.convertAmp(item.name).replace(/“/g, '«').replace(/”/g, '»');

					page = {
						id: item.id,
						isProduct: true,
						name: item.name,
						path: `${path}/` + `${item.id} - ${item.name}`.replace(/\*/g, 'x').replace(/\//g, '-').replace(/!/g, '1'),
						image: item.image,
						images: images.filterBy({product: item.id}),
						category: [item.category],
						html: utils.convertAmp(item.html)
					};

					page.files = [];
					page.html.replace(urlsRe, (match, $1) => {

						if (!/http|index\.php|grandorchidtravel\.ru|youtube/i.test($1))
							page.files.push($1);
					});
					//page.files.length && log(item.name, pages.files);

					pages.push(page);

					fs.mkdirSync(`${app.conf.tempPath}/${page.path}`);
					promises.push(
						fs.writeFile(`${app.conf.tempPath}/${page.path}/content.html`, page.html)
					);
				}
			});

			log(`Readed ${pages.length} pages`);

			var writePagesJob = RSVP
				.all(promises)
				.then(() => log(`Pages data writed.`));

			res = yield db.query(`
				SELECT
					${p}information_description.information_id AS id,
					${p}information_description.title AS name,
					${p}information_description.description AS html
				FROM
					${p}information_description
				WHERE
					${p}information_description.language_id = 1
			`);

			log('Write infos...');
			path = 'infos';
			fs.mkdirSync(`${app.conf.tempPath}/${path}`);

			promises = [];
			res[0].forEach((item) => {

				var page  = {
					id: item.id,
					name: item.name,
					path: `${path}/` + `${item.id} - ${item.name}`.replace(/\*/g, 'x').replace(/\//g, '-').replace(/!/g, '1'),
					html: utils.convertAmp(item.html)
				};

				page.files = [];
				page.html.replace(urlsRe, (match, $1) => {

					if (!/http|index\.php|grandorchidtravel\.ru|youtube/i.test($1))
						page.files.push($1);
				});
				//info.files.length && log(item.name, files);

				pages.push(page);

				fs.mkdirSync(`${app.conf.tempPath}/${page.path}`);
				promises.push(
					fs.writeFile(`${app.conf.tempPath}/${page.path}/content.html`, page.html)
				);
			});

			var writeInfosJob = RSVP
				.all(promises)
				.then(() => log(`Infos data writed.`));

			promises = [];

			//log('Copy files...');
			//for (var a = pages.concat(infos), l = a.length, i = 0; i < l; i++) {
			//
			//	for (var a1 = a[i].files.concat([a[i].image] || []).concat([i].images || []), l1 = a1.length, i1 = 0; i1 < l1; i1++) {
			//
			//		var src = a1[i1];
			//		if (src) {
			//
			//			if (src.match(/^data/))
			//				src = `image/${src}`;
			//
			//			src = src.replace(/(["'`])/g, '\\$1');
			//			var dst = a[i].path.replace(/(["'`])/g, '\\$1');
			//
			//			//promises.push(
			//				yield bash
			//					.send(`cp "${app.conf.openCartRoot}/${src}" "${app.conf.tempPath}/${dst}"`)
			//					.then(function (text) {
			//
			//						if (text && text.match(/No\ssuch\sfile\sor\sdirectory/))
			//							log(text);
			//					});
			//			//);
			//
			//			//if (a[i].path.match(/NEW!/))
			//			//	return;
			//		}
			//	}
			//}
			//
			//var copyFilesJob = RSVP
			//	.all(promises)
			//	.then(() => log(`Files copied.`));

			for (var l = pages.length, i = 0; i < l; i++) {

				var page = pages[i];
				var postId;

				if (page.isProduct) {

					postId = yield bash.send(`wp post create "${app.conf.tempPath}/${page.path}/content.html" --post_type=page --post_title="${page.name}" --post-name="${page.name.dasherize()}" --post_status=publish`);
					var matches  = postId.match(/Success:\sCreated\D+(\d+)\D/);
					if (!matches) {

						log.error('Error creating post - ${postId}');
						utils.shutdown();
					}

					postId = matches[1];

					res = yield bash.send(`wp post meta set ${postId} amur-custom customAmur`);
					log(res);
					utils.shutdown();
				}
			}

			return RSVP.all([
				writePagesJob,
				writeInfosJob
				//copyFilesJob
			]);
		})
			.then(() => {

				utils.shutdown();
			})
			.catch(utils.catch());
	};

	return app;
};
