var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server, {
	pingInterval: 1000,
	pingTimeout: 5000
});

var port = 8080;
server.listen(port);
app.use(express.static(__dirname + '/client'));

var users = new Map();
var usersID = new Map();

io.on('connection', function(socket) {
	console.log(socket.id.toString() + " connected, total: " + io.engine.clientsCount);
	socket.on('disconnect', function() {
		console.log(socket.id.toString() + " disconnected, total: " + io.engine.clientsCount);
		if(users.has(socket)) {
			let user = users.get(socket);
			let name = user[0];
			let id = user[1];
			socket.broadcast.emit('usr-disc', id);
			usersID.delete(id);
			users.delete(socket);
			console.log(name + " left the game. Total: " + users.size);
		}
	});

	socket.on('registration', function (name) {
		if(users.has(socket)) {
			return;
		}
		if(!name || name.length === 0) {
			socket.emit('reg-error');
		}
		else {
			let nid = 0;
			for(; nid < usersID.size; nid++) {
				if(!usersID.has(nid)) {
					break;
				}
			}
			usersID.set(nid, socket);
			users.set(socket, [name, nid, [100, 100]]);
			console.log(name + "[" + nid + "] joined the game. Total: " + users.size);
			socket.emit('reg-success', socket.id.toString(), name, nid);
			socket.broadcast.emit('new-player', name, users.size, nid);
		}
	});

	socket.on('coords', function (coord) {
		if(users.has(socket)) {
			users.get(socket)[2] = coord;
		}
	});
});

function tick() {
	for(let usr of users) {
		usr[0].emit('position', usr[1]);
		usr[0].broadcast.emit('position', usr[1]);
	}
}

setInterval(tick, 15);

io.use(function (packet, next) {
	return next();
})