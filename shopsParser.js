'use strict';

const parseShop = require('./shopParser');

module.exports = shops => {
	let url, id, shopname, price, delimetr;
	for (let i = 0; i < shops.length; i++){
		url = Object.keys(shops[i])[0];
		id = shops[i][url]['product_id_column'];
		shopname = shops[i][url]['shopname'];
		price = shops[i][url]['price_column'];
		delimetr = shops[i][url]['delimetr'];
		if (i === (shops.length-1)) {
			parseShop(url, shopname, id, price, delimetr, true);
		}
		else {
			parseShop(url, shopname, id, price, delimetr);
		}
	}
};
