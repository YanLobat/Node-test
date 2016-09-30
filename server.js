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

const client = redis.createClient({host: "127.0.0.1", port: "6379"});

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3001');
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
	constructor() {
		super({readableObjectMode: true, writableObjectMode: true});
		this.counter = 0;
	}
	itemsFilter(row, done) {
		let obj_item = {
			pzn: parseInt(row[0]),
			price: row[1],
			// name: row[2],
			// abda_category: row[3],
			// category: row[4],
			// categorytree: row[5],
			// in_stock: row[6]
		};
		if (obj_item.pzn && obj_item !== "PZN")
			this.push(obj_item);
		return done();

	}
	_transform(chunk, _, done) {
		console.log(this.counter++);
		let itemArray = chunk.split(";");// split the lines on delimiter
		this.itemsFilter(itemArray, done);//check will it be a new item 
	}
}
class MyWritable extends stream.Writable {
	constructor() {
		super({ objectMode: true });
	}
	_write(item, _, done) {
		console.log(item.pzn);
		client.set(item.pzn, item.price)
		// items.push(item);
		done();
	}
	end() {
		client.get("274364",function(err, reply) {
		    // reply is null when the key is missing
		    console.log(reply);
		});
	}
}

let transformer = new MyTransform();
let bulker = new MyWritable();
request('http://www.apodiscounter.de/partnerprogramme/krn.csv')
.pipe(split())
.pipe(transformer)
.pipe(bulker)
.on('error', function(){
	console.log('Error while reading file.');
})
.on('end', function(){
	console.log('Read entire file.')
});