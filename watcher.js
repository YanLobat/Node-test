'use strict';

const fs = require('fs');
const YAML = require('yamljs');

const shopsParser = require('./shopsParser');

module.exports = filename => {
	fs.watch(filename, (eventType, file) => {
		if ((eventType === 'change') && (filename === file)){
			const shops = YAML.load(filename);
			shopsParser(shops);
		}
	});
};