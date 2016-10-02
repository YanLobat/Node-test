#!/usr/bin/env node

/**
 * Module dependencies.
 */
const express = require('express');
const app = express();
const http = require('http'); 
const fs = require('fs');
const stream = require('stream');
const split = require('split');
const es = require('event-stream');
const request = require('request');
const redis = require('redis');
const YAML = require('yamljs');

const client = redis.createClient({host: "127.0.0.1", port: "6379"});

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '9000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}


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
		// console.log(row);
		if (pzn && pzn !== "PZN")
			this.push(obj_item);
		return done();

	}
	_transform(chunk, _, done) {
		let itemArray = chunk.split(this.delimetr);// split the lines on delimiter
		// console.log(this.delimetr)
		this.itemsFilter(itemArray, done);//check will it be a new item 		
	}
}

class MyWritable extends stream.Writable {
	constructor(shopname) {
		super({ objectMode: true });
		this.shopname = shopname;
	}
	_write(item, _, done) {
		let key = this.shopname+Object.keys(item)[0];
		if (key === undefined)
			console.log(item);
		client.hmset(key, item, (err, reply) => {
			// console.log(reply);
		});
		done();
	}
}

const shops = YAML.load("config.yml");
for (let i = 0; i < shops.length; i++){
	let url = Object.keys(shops[i])[0];
	let id = shops[i][url]["product_id_column"];
	let shopname = shops[i][url]["shopname"];
	let price = shops[i][url]["price_column"];
	let delimetr = shops[i][url]["delimetr"];

	parseShop(url, shopname, id, price, delimetr);
}
function parseShop(url, shopname, id, price, delimetr) {
	let transformer = new MyTransform(id, price, delimetr);
	let bulker = new MyWritable(shopname);
	request(url)
	.pipe(split())
	.pipe(transformer)
	.pipe(bulker)
	.on('error', function(){
		console.log('Error while reading file.');
	})
	.on('end', function(){
		console.log('Read entire file.')
	});	
}

app.get("/", (req, res) => {
	let key = req.query.shop+req.query.product_id;
	console.log(key);
	client.hgetall(key, (err, reply) => {
		console.log(reply);
		return res.send(reply);
	});
});