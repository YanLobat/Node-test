'use strict';

const express = require('express');
const app = express();
const http = require('http'); 
const redis = require('redis');
const YAML = require('yamljs');

const config = YAML.load('config.yml');
const client = redis.createClient({host: config.host, port: config.DBport});
const shops = YAML.load(config.shopsFile);
const shopsParser = require('./shopsParser');
const watcher = require('./watcher');

const port = config.port;
app.set('port', port);

const server = http.createServer(app);
server.listen(port);
server.on('error', onError);

function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = typeof port === 'string'
	? 'Pipe ' + port
	: 'Port ' + port;

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

process.env.PARSING = true;
shopsParser(shops);
watcher(config.shopsFile);

// I can take this parts to routes folder but there are only 2 routes
app.get('/', (req, res) => {
	let key = req.query.shop+req.query.product_id;
	client.hgetall(key, (err, reply) => {
		if (reply) {
			return res.send(reply);
		}
		else {
			return res.send('Not found');
		}
	});
});

app.get('/update', (req, res) => {
	// if it isn't parsing at the moment
	if (!process.env.PARSING) {
		shopsParser(shops);
	}
});
