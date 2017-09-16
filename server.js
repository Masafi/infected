var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server, {
	pingInterval: 1000,
	pingTimeout: 5000
});

var port = 80;
server.listen(port);
app.use(express.static(__dirname + '/client'));

io.on('connection', function(socket) {
	console.log(socket.id.toString() + " connected, total: " + io.engine.clientsCount);
	socket.on('disconnect', function() {
		console.log(socket.id.toString() + " disconnected, total: " + io.engine.clientsCount);
	});
});