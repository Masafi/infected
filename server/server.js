//Modules
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server, {
	pingInterval: 1000,
	pingTimeout: 10000
});
var jwt = require('jsonwebtoken');
var jwtSecretKey = "infectednotsecretkey";
var taffy = require('taffydb');

//HTTP server
var port = process.env.PORT || 80;
server.listen(port);
app.use(express.static(__dirname + '/../client'));

//Game server
///Vars
var lastTickTime = new Date().getTime();
var usersNetwork = taffy.taffy();
var ids = [];
var players = [];
var socketid = new Map();

///Sockets behavior
io.on('connection', function(socket) {
	console.log(socket.id.toString() + " connected, total: " + io.engine.clientsCount);
	socketid.set(socket.id.toString(), socket);
	socket.emit('requestToken');

	socket.on('returnToken', function (token) {
		var good = 1;
		if(token) {
			jwt.verify(token, function (err, decoded) {
				if(err) {
					good = 0;	
				}
			});
		}
		else {
			good = 0;
			return;
		}
		if(good) {
			var usr = usersNetwork({'token': token});
			good = usr.count() > 0;
		}
		if(good) {
			socket.join('users');
			usersNetwork({'token': token}).update({'socket': socket.id.toString()});
		}
		else {
			socket.emit('reg-error', "Token extension error");
		}
	});

	socket.on('registration', function (name) {
		if(usersNetwork({'socket': socket.id.toString()}).count() > 0) {
			return;
		}
		if(!name || name.length === 0) {
			socket.emit('reg-error', "Username empty!");
		}
		else {
			socket.join('users');
			var nid = reqId();
			var pl = new Player(name, nid, socket.id.toString());
			players.length = Math.max(nid + 1, players.length);
			players[nid] = pl;
			var tok = pl.network.makeToken();
			usersNetwork.insert({'id': nid, 'socket': socket.id.toString(), 'token': tok});
			socket.emit('reg-success', tok, nid, name)

			var data = [];
			data.push(1);
			platforms.forEach(function(item, i, arr) {
				data.push([item.pos, item.size]);
			});
			socket.emit('update', data);
			console.log(name +  "joined the game. Total: " + usersNetwork().count());
		}
	});

	socket.on('keyboard', function (key, state, token) {
		if(verifyToken(token)) {
			players[usersNetwork({'token': token}).first().id].keys[key] = state;
		}
	});

	socket.on('disconnect', function() {
		console.log(socket.id.toString() + " disconnected, total: " + io.engine.clientsCount);
		if(usersNetwork({'socket': socket.id.toString()}).count() > 0) {
			var usr = usersNetwork({'socket': socket.id.toString()}).first();
			var name = players[usr.id].network.name;
			var id = usr.id;
			ids[id] = false;
			usersNetwork({'socket': socket.id.toString()}).remove();
			console.log(name + " left the game. Total: " + usersNetwork().count());
		}
		socketid.delete(socket.id.toString());
	});
});

function verifyToken(token) {
	var good = 1;
	if(token) {
		jwt.verify(token, jwtSecretKey, function (err, decoded) {
			if(err) {
				good = 0;	
			}
		});
	}
	else {
		good = 0;
	}
	if(good) {
		good = usersNetwork({'token': token}).count() > 0;
	}
	return good;
}

function reqId() {
	for (var i = 0; i < ids.length; i++) {
		if(ids[i] == false) {
			ids[i] = true;
			return i;
		}
	}
	ids.push(true);
	return ids.length - 1;
}

//Game logic
var platforms = [];

class NetworkPrimitive {
	constructor() {
		this.nickname = "";
		this.id = -1;
		this.socket = undefined;
		this.token = undefined;
	}

	makeToken() {
		var profile = {};
		profile.nick = this.nickname;
		profile.sid = this.socket;
		profile.id = this.id;
		this.token = jwt.sign(profile, jwtSecretKey, { expiresIn: "24h" });
		return this.token;
	}
}

class Vector2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	add(v) {
		return new Vector2(this.x + v.x, this.y + v.y);
	}

	sub(v) {
		return new Vector2(this.x - v.x, this.y - v.y);
	}

	neg() {
		return new Vector2(-this.x, -this.y);
	}

	mul(v) {
		return new Vector2(this.x * v.x, this.y * v.y);
	}

	mula(v) {
		return new Vector2(this.x * v, this.y * v);
	}

	max(v) {
		return new Vector2(Math.max(this.x, v.x), Math.max(this.y, v.y));
	}

	min(v) {
		return new Vector2(Math.min(this.x, v.x), Math.min(this.y, v.y));
	}

	toArr() {
		return [this.x, this.y];
	}

	abs() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
}

class PhysicPrimitive {
	constructor() {
		this.pos = new Vector2(0, 0);
		this.size = new Vector2(0, 0);
		this.vel = new Vector2(0, 0);
		this.acc = new Vector2(0, 0);
		this.mxvel = new Vector2(0, 0);
		this.standing = false;
		this.g = 1000;
	}

	updateSpeed(dt) {
		return this.vel.add(this.acc.mula(dt)).max(this.mxvel.neg()).min(this.mxvel);
	}

	updatePosition(vel, dt) {
		return this.pos.add(vel.mula(dt));
	}

	collision(that, dt) {
		var relv = this.vel.sub(that.vel);
		/*var bigBox = new PhysicPrimitive();
		bigBox.pos = this.pos.min(this.updatePosition(relv, dt));
		bigBox.size = this.pos.max(this.updatePosition(relv, dt)).add(this.size).sub(bigBox.pos);
		if (bigBox.intersects(that)) {*/
			var invEntry = new Vector2(0, 0);
			var invExit = new Vector2(0, 0);
			if (relv.x >= 0) {
				invEntry.x = that.pos.x - (this.pos.x + this.size.x);
				invExit.x = (that.pos.x + that.size.x) - this.pos.x;
			} else {
				invEntry.x = (that.pos.x + that.size.x) - this.pos.x;
				invExit.x = that.pos.x - (this.pos.x + this.size.x);
			}
			if (relv.y >= 0) {
				invEntry.y = that.pos.y - (this.pos.y + this.size.y);
				invExit.y = (that.pos.y + that.size.y) - this.pos.y;
			} else {
				invEntry.y = (that.pos.y + that.size.y) - this.pos.y;
				invExit.y = that.pos.y - (this.pos.y + this.size.y);
			}
			var entry = new Vector2(0, 0);
			var exit = new Vector2(0, 0);
			if (relv.x == 0) {
				entry.x = Math.sign(invEntry.x) * (dt + 1);
				exit.x = Math.sign(invExit.x) * (dt + 1);
			} else {
				entry.x = invEntry.x / relv.x;
				exit.x = invExit.x / relv.x;
			}
			if (relv.y == 0) {
				entry.y = Math.sign(invEntry.y) * (dt + 1);
				exit.y = Math.sign(invExit.y) * (dt + 1);
			} else {
				entry.y = invEntry.y / relv.y;
				exit.y = invExit.y / relv.y;
			}
			var entryTime = Math.max(entry.x, entry.y);
			var exitTime = Math.min(exit.x, exit.y);
			var normal = new Vector2(0, 0);
			if (entryTime > exitTime || entry.x < 0 && entry.y < 0 || entry.x > dt || entry.y > dt) {
				return [dt + 1, normal];
			} else {
				if (entry.x > entry.y) {
					if (invEntry.x < 0) {
						normal = new Vector2(1, 0);
					} else {
						normal = new Vector2(-1, 0);
					}
				} else {
					if (invEntry.y < 0) {
						normal = new Vector2(0, 1);
					} else {
						this.standing = true;
						normal = new Vector2(0, -1);
					}
				}
				return [entryTime, normal];
			}
		/*}
		else {
			return [dt + 1, new Vector2(0, 0)];
		}*/
	}

	intersects(that) {
		return  (this.pos.x >= that.pos.x && this.pos.x <= that.pos.x + that.size.x ||
				this.pos.x + this.size.x >= that.pos.x && this.pos.x + this.size.x <= that.pos.x + that.size.x) &&
				(this.pos.y >= that.pos.y && this.pos.y <= that.pos.y + that.size.y ||
				this.pos.y + this.size.y >= that.pos.y && this.pos.y + this.size.y <= that.pos.y + that.size.y) ||
				(that.pos.x >= this.pos.x && that.pos.x <= this.pos.x + this.size.x ||
				that.pos.x + that.size.x >= this.pos.x && that.pos.x + that.size.x <= this.pos.x + this.size.x) &&
				(that.pos.y >= this.pos.y && that.pos.y <= this.pos.y + this.size.y ||
				that.pos.y + that.size.y >= this.pos.y && that.pos.y + that.size.y <= this.pos.y + this.size.y);
	}
}

class Player {
	constructor(name, id, socket) {
		this.keys = {};
		this.id = id;

		this.physics = new PhysicPrimitive();
		this.physics.pos = new Vector2(200, 200);
		this.physics.size = new Vector2(66, 92);
		this.physics.mxvel = new Vector2(400, 1000);
		this.physics.acc = new Vector2(0, this.physics.g);

		this.network = new NetworkPrimitive();
		this.network.nickname = name;
		this.network.id = id;
		this.network.socket = socket;
	}

	processKeys() {
		if(this.keys['a']) {
			this.physics.vel.x = -400;
		}
		else if(this.keys['d']) {
			this.physics.vel.x = 400;
		}
		else {
			this.physics.vel.x = 0;
		}
		if(this.keys['w'] && this.physics.standing == 1) {
			this.physics.vel.y = -1000;
		}
	}
}

function setup() {
	var plat = new PhysicPrimitive();
	plat.pos = new Vector2(-100, 700);
	plat.size = new Vector2(2000, 100);
	platforms.push(plat);
	var plat = new PhysicPrimitive();
	plat.pos = new Vector2(-100, -100);
	plat.size = new Vector2(2000, 100);
	platforms.push(plat);
	var plat = new PhysicPrimitive();
	plat.pos = new Vector2(-100, -100);
	plat.size = new Vector2(100, 2000);
	platforms.push(plat);
	var plat = new PhysicPrimitive();
	plat.pos = new Vector2(1200, -100);
	plat.size = new Vector2(100, 2000);
	platforms.push(plat);

	var plat = new PhysicPrimitive();
	plat.pos = new Vector2(300, 400);
	plat.size = new Vector2(100, 100);
	platforms.push(plat);
	var plat = new PhysicPrimitive();
	plat.pos = new Vector2(600, 300);
	plat.size = new Vector2(100, 20);
	platforms.push(plat);
	setInterval(tick, 16);
}

setup();

function tick() {
	var curTime = new Date().getTime();
	var dt = (curTime - lastTickTime) / 1000;
	lastTickTime = curTime;
	var data = [];
	data.push(0);
	players.forEach(function (item, i, arr) {
		var iData = {};
		item.processKeys();
		item.physics.vel = item.physics.updateSpeed(dt);
		item.physics.standing = false;
		var colDataFin = [dt + 1, new Vector2(0, 0)];
		platforms.forEach(function(pl, i, arr) {
			var colData = item.physics.collision(pl, dt);
			if(colData[0] >= 0 && colData[0] <= colDataFin[0]) {
				colDataFin = colData;
			}
		});
		if(colDataFin[0] >= 0 && colDataFin[0] <= dt) {
			item.physics.pos = item.physics.updatePosition(item.physics.vel, colDataFin[0]);
			var dotprod = (item.physics.vel.x * colDataFin[1].y + item.physics.vel.y * colDataFin[1].x);
			item.physics.vel.x = dotprod * colDataFin[1].y;
			item.physics.vel.y = dotprod * colDataFin[1].x;
			item.physics.pos = item.physics.updatePosition(item.physics.vel, dt - colDataFin[0]);
		}
		else {
			item.physics.pos = item.physics.updatePosition(item.physics.vel, dt);
		}
		iData.id = item.id;
		iData.coords = item.physics.pos.toArr();
		data.push(iData);
	});

	io.to('users').emit('update', data);
}
