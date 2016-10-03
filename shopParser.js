/*eslint no-process-env: "error"*/

'use strict';

const stream = require('stream');
const split = require('split');
const request = require('request');
const redis = require('redis');
const YAML = require('yamljs');


const config = YAML.load('config.yml');
const client = redis.createClient({host: config.host, port: config.DBport});

class MyTransform extends stream.Transform {
	constructor(id, price, delimetr) {
		super({readableObjectMode: true, writableObjectMode: true});
		this.counter = 0;
		this.id = id;
		this.price = price;
		this.delimetr = delimetr;
	}
	itemsFilter(row, done) {
		let obj_item = {};
		let pzn = row[this.id];
		let price = row[this.price];
		obj_item[pzn] = price;
		//if line is not empty or first
		if (pzn && pzn !== 'PZN')
			this.push(obj_item);
		return done();

	}
	_transform(chunk, _, done) {
		let itemArray = chunk.split(this.delimetr);// split the lines on delimiter
		this.itemsFilter(itemArray, done);		
	}
}

class MyWritable extends stream.Writable {
	constructor(shopname, isLast) {
		super({ objectMode: true });
		this.shopname = shopname;
		if (isLast !== undefined) {
			this.isLast = isLast;
		}
	}
	_write(item, _, done) {
		let key = this.shopname+Object.keys(item)[0];
		client.hmset(key, item, err => {
			if (err) {
				console.log(err);
			}
			done();
		});
		
	}
	end() {
		if (this.isLast) {
			process.env.PARSING = false;
		}
	}
}


module.exports = (url, shopname, id, price, delimetr, isLast) => {
	let transformer = new MyTransform(id, price, delimetr);
	let bulker = new MyWritable(shopname, isLast);
	request(url)
	.pipe(split())
	.pipe(transformer)
	.pipe(bulker)
	.on('error', function(){
		console.log('Error while reading file.');
	});
};