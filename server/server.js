var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server, {
	pingInterval: 1000,
	pingTimeout: 5000
});

const moves = [[0, -1], [-1, 0], [0, 1], [1, 0]];

var port = process.env.PORT || 80;
server.listen(port);
app.use(express.static(__dirname + '/../client'));

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
			users.set(socket, [name, nid, [100, 100], [0, 0, 0, 0]]);
			console.log(name + "[" + nid + "] joined the game. Total: " + users.size);
			socket.emit('reg-success', socket.id.toString(), name, nid);
			socket.broadcast.emit('new-player', name, users.size, nid);
		}
	});

	socket.on('keyboard', function (key) {
		if(users.has(socket)) {
			users.get(socket)[3][key] = 1;
		}
	});
});

function tick() {
	for(let usr of users) {
		for(let i = 0; i < 4; i++) {
			if(usr[1][3][i] == 1) {
				usr[1][2][0] += 5 * moves[i][0];
				usr[1][2][1] += 5 * moves[i][1];
			}
			usr[1][3][i] = 0;
		}
		usr[0].emit('position', usr[1]);
		usr[0].broadcast.emit('position', usr[1]);
	}
}

setInterval(tick, 15);

io.use(function (packet, next) {
	return next();
});


class PhysicPrimitive {
	constructor() {
		this.x = 0;
		this.y = 0;
		this.w = 0;
		this.h = 0;
		this.vx = 0;
		this.vy = 0;
		this.ax = 0;
		this.ay = 0;
		this.mxvx = 0;
		this.mxvy = 0;
		this.g = 10;
	}

	collision(prim) {
		
	}
}

