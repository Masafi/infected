//Modules
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server, {
	pingInterval: 1000,
	pingTimeout: 10000
});
var jwt = require('jsonwebtoken');
var taffy = require('taffydb');
var fs = require('fs');
var csvParse = require('csv-parse');
var path = '';
var util = require('util');
var sanitizeHtml = require('sanitize-html');
var logFile = fs.createWriteStream(path + 'log.txt', { flags: 'a' });
var logStdout = process.stdout;

var version = "0.1.1";
var jwtSecretKey = "supersecrettodochange";

//HTTP server
var port = process.env.PORT || 80;
server.listen(port);
app.use(express.static(path + 'client'));

//Game server
///Vars
var lastTickTime = new Date().getTime();
var blockInfo = [];
var usersNetwork = taffy.taffy();
var mxPlayers = 100;
var renderDistance = 30;

Object.defineProperty(global, '__stack', {
  get: function(){
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack){ return stack; };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});

Object.defineProperty(global, '__line', {
  get: function(){
    return __stack[2].getLineNumber();
  }
});

function log(string, warn = 0) {
	var d = new Date();
	var p = (v) => { return (v < 10 ? '0' : '') + v; }
	var pref = p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()) + " [";
	if(warn == 0) pref += 'INFO';
	else if(warn < 0) pref += 'DBG';
	else if(warn == 1) pref += 'WARN';
	else if(warn == 2) pref += 'ERR';
	else pref += 'ERR#' + warn;
	pref += ':' + __line + ']: ';
	if(warn >= 0) logFile.write(pref + util.format(string) + '\n');
	logStdout.write(pref + util.format(string) + '\n');
}

process.on('uncaughtException', function(err) {
	log(err, 2);
	process.exit(1);
});

function verifyToken(token) {
	var good = true;
	if(token) {
		jwt.verify(token, jwtSecretKey, function (err, decoded) {
			if(err) {
				good = false;	
			}
		});
	}
	else {
		good = false;
	}
	good = good && usersNetwork({'token': token}).count() > 0;
	return good;
}

function reqId() {
	var i = 0;
	for(; usersNetwork({'id': i}).count() > 0; i++);
	return i;
}

function emitRooms() {
	var data = [];
	rooms.forEach(function(room, i, arr) {
		var obj = {};
		obj.id = room.id;
		obj.players = room.cntSides;
		obj.started = room.started;
		data.push(obj);
	});
	io.to('lobby').emit('rooms', data);
}

///Sockets behavior
io.on('connection', function(socket) {
	socket.emit('requestToken');

	socket.on('returnToken', function (token) {
		var good = verifyToken(token);
		if(good) {
			socket.join('users');
			var usr = usersNetwork({'token': token}).first();
			usr.network.socket = socket;
			usr.network.left = false;
			usr.network.makeToken();
			usr.token = usr.network.token;
			usr.socket = socket.id.toString();
			socket.emit('reg-success', usr.token, usr.id, usr.network.name);
			var room = usr.network.room;
			if(room >= 0 && room < rooms.length) {
				socket.join('room' + room);
				if(rooms[room].started) {
					socket.emit('gameStarted', usr.network.side, usr.network.gameId);
				}
				else {
					rooms[room].emitRoom();
				}
			}
			else {
				socket.join('lobby');
			}
			log(usr.network.name + " rejoined the game. Total: " + usersNetwork().count());
		}
		else {
			socket.emit('reg-error', "Token extension error");
		}
	});

	socket.on('registration', function (name, side) {
		if(usersNetwork({'socket': socket.id.toString()}).count() > 0) {
			return;
		}
		var empty = true;
		name = sanitizeHtml(name, {allowedTags: [], allowedAttributes: []});
		if(name.length >= 16) {
			name = name.substr(0, 16);
		}
		if(name) {
			for(let i = 0; i < name.length; i++) {
				if(name[i] != ' ') {
					empty = false;
					break;
				}
			}
		}
		if(empty) {
			socket.emit('reg-error', "Username empty!");
		}
		else {
			var network = new NetworkPrimitive();
			network.name = name;
			network.id = reqId();
			network.socket = socket;
			if(side != 1 && side != 0) {
				side = 0;
			}
			network.side = side;
			network.makeToken();
			socket.join('users');
			socket.join('lobby');
			usersNetwork.insert({'id': network.id, 'socket': socket.id.toString(), 'token': network.token, 'network': network});
			socket.emit('reg-success', network.token, network.id, name);
			log(name +  " (" + network.id + ") joined the game. Total: " + usersNetwork().count());
		}
	});

	socket.on('joinRoom', function(token, room) {
		if(verifyToken(token)) {
			var network = usersNetwork({'token': token}).first().network;
			if(room >= 0 && room < rooms.length && network.room == -1 && !rooms[room].started && (rooms[room].cntSides[0] < mxPlayers || rooms[room].cntSides[1] < mxPlayers)) {
				var side = (rooms[room].cntSides[0] <= rooms[room].cntSides[1] ? 0 : 1);
				network.side = side;
				network.room = room;
				network.roomId = rooms[room].network.length;
				rooms[room].network.push(network);
				rooms[room].cntSides[network.side]++;
				socket.join('room' + room);
				socket.leave('lobby');
				rooms[room].emitRoom();
				emitRooms();
			}
		}
		else {
			socket.emit('reg-error', "Token extension error");
		}
	});

	socket.on('leaveRoom', function (token) {
		if(verifyToken(token)) {
			var network = usersNetwork({'token': token}).first().network;
			var room = network.room;
			if(room >= 0 && room < rooms.length) {
				rooms[room].network.splice(network.roomId, 1);
				network.room = -1;
				network.roomId = -1;
				network.ready = false;
				rooms[room].cntSides[network.side]--;
				socket.leave('room' + room);
				socket.join('lobby');
				rooms[room].emitRoom();
				emitRooms();
			}
		}
		else {
			socket.emit('reg-error', "Token extension error");
		}
	});

	socket.on('joinSide', function(token, team) {
		if(verifyToken(token)) {
			var network = usersNetwork({'token': token}).first().network;
			var room = network.room;
			var curside = network.side;
			if(curside != team) {
				var toside = 1 - curside;
				if(room >= 0 && room < rooms.length && !rooms[room].started && rooms[room].cntSides[toside] < mxPlayers) {
					rooms[room].cntSides[toside]++;
					rooms[room].cntSides[curside]--;
					network.side = toside;
				}
			}
			rooms[room].emitRoom();
		}
		else {
			socket.emit('reg-error', "Token extension error");
		}
	});

	socket.on('ready', function(token, val) {
		if(verifyToken(token)) {
			var network = usersNetwork({'token': token}).first().network;
			var room = network.room;
			if(room >= 0 && room < rooms.length) {
				network.ready = val;
				rooms[room].emitRoom();
			}
		}
		else {
			socket.emit('reg-error', "Token extension error");
		}
	});

	socket.on('requestChunk', function(i, j, token) {
		if(verifyToken(token)) {
			var network = usersNetwork({'token': token}).first().network;
			var room = network.room;
			if(room >= 0 && room < rooms.length && rooms[room].started) {
				var pos;
				var shift = screenSize.diva(2).div(CellSize);
				if(network.side == 0) {
					pos = rooms[room].players[network.gameId].physics.rpos;
				}
				else {
					pos = rooms[room].viruses[network.gameId].pos.div(CellSize);
				}
				pos = pos.max(shift).min(mapSize.sub(shift));
				var chunkPos = rooms[room].map.map[i][j].physics.pos;
				var dist = Math.max(Math.min(Math.abs(chunkPos.x - pos.x), 
										 Math.abs(chunkPos.x + chunkSize - pos.x)), 
								Math.min(Math.abs(chunkPos.y - pos.y), 
										 Math.abs(chunkPos.y + chunkSize - pos.y)));
				if(dist <= renderDistance) {
					rooms[room].map.emitChunk(i, j, socket);
				}
			}
		}
		else {
			socket.emit('reg-error', "Token extension error");
		}
	});

	socket.on('requestRooms', function(token) {
		if(verifyToken(token)) {
			var data = [];
			rooms.forEach(function(room, i, arr) {
				var obj = {};
				obj.id = room.id;
				obj.players = room.cntSides;
				obj.started = room.started;
				data.push(obj);
			});
			socket.emit('rooms', data);
		}
		else {
			socket.emit('reg-error', "Token extension error");
		}
	});

	socket.on('keyboard', function (key, state, token) {
		if(verifyToken(token)) {
			var network = usersNetwork({'token': token}).first().network;
			var room = network.room;
			if(room >= 0 && room < rooms.length && rooms[room].started) {
				if(network.side == 0) rooms[room].players[network.gameId].keys[key] = state;
				else rooms[room].viruses[network.gameId].keys[key] = state;
			}
		}
		else {
			socket.emit('reg-error', "Token extension error");
		}
	});

	socket.on('mouse', function (pos, button, state, token) {
		if(verifyToken(token)) {
			var network = usersNetwork({'token': token}).first().network;
			var room = network.room;
			if(room >= 0 && room < rooms.length && rooms[room].started) {
				var player = undefined;
				if(network.side == 0) {
					player = rooms[room].players[network.gameId];
				}
				else {
					player = rooms[room].viruses[network.gameId];
				}
				player.mousePos = new Vector2(pos.x, pos.y);
				player.mouseUpdated = true;
				player.mouseButton = button;
				player.state = state;
			}
		}
		else {
			socket.emit('reg-error', "Token extension error");
		}
	});

	socket.on('cheats', function(token, pass) {
		if(verifyToken(token) && pass == "truepassword") {
			var network = usersNetwork({'token': token}).first().network;
			var room = network.room;
			if(room >= 0 && room < rooms.length && rooms[room].started) {
				var pl;
				if(network.side == 0) {
					pl = rooms[room].players[network.gameId];
				}
				else {
					pl = rooms[room].viruses[network.gameId];
				}
				pl.workers = 10;
				pl.energy = 10000;
				pl.stone = 10000;
				pl.iron = 10000;
			}
		}
	});

	socket.on('disconnect', function() {
		if(usersNetwork({'socket': socket.id.toString()}).count() > 0) {
			var usr = usersNetwork({'socket': socket.id.toString()}).first();
			var network = usr.network;
			network.left = true;
			network.leftTime = Date.now();
			var room = network.room;
			if(room >= 0 && room < rooms.length && !rooms[room].started) {
				rooms[room].network.splice(network.roomId, 1);
				rooms[room].cntSides[network.side]--;
				network.room = -1;
				network.roomId = -1;
				socket.leave('room' + room);
				socket.join('lobby');
				rooms[room].emitRoom();
				emitRooms();
			}
			log(network.name + " left the game. Total: " + usersNetwork().count());
		}
	});
});

//Game logic
const eps = 1e-6;
const chunkSize = 8;
const maxHeight = 15;

class Vector2 {
	constructor(x, y) {
		this.x = x || 0;
		this.y = y || 0;
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

	div(v) {
		return new Vector2(this.x / v.x, this.y / v.y);
	}

	mula(v) {
		return new Vector2(this.x * v, this.y * v);
	}

	diva(v) {
		return new Vector2(this.x / v, this.y / v);
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

	copy() {
		return new Vector2(this.x, this.y);
	}

	round() {
		return new Vector2(Math.floor(this.x), Math.floor(this.y));
	}
}

var mapSize = new Vector2(512, 128);
var CellSize = new Vector2(16, 16);
var screenSize = new Vector2(1536, 734).diva(1.7);

class NetworkPrimitive {
	constructor() {
		this.name = "";
		this.id = -1;
		this.socket = undefined;
		this.token = undefined;
		this.left = false;
		this.room = -1;
		this.roomId = -1;
		this.side = 0;
		this.left = false;
		this.ready = false;
		this.gameId = -1;
		this.leftTime = Date.now();
	}

	makeToken() {
		var profile = {};
		profile.nick = this.name;
		profile.sid = this.socket.id.toString();
		profile.id = this.id;
		this.token = jwt.sign(profile, jwtSecretKey, { expiresIn: "12h" });
		return this.token;
	}
}

class PhysicPrimitive {
	constructor() {
		this._pos = new Vector2(0, 0);
		this.size = new Vector2(0, 0);
		this.vel = new Vector2(0, 0);
		this.acc = new Vector2(0, 0);
		this._rpos = new Vector2(0, 0);
		this.frameVel = new Vector2(0, 0);
		this.rscale = CellSize.add(new Vector2(0, 0));
		this.standing = false;
		this.g = 1000;
		this.slowDown = new Vector2(20, 0);
	}

	updateSpeed(dt) {
		return this.vel.add(this.acc.mula(dt));
	}

	updatePosition(vel, dt) {
		return this.pos.add(vel.mula(dt));
	}

	brakes(dt) {
		this.frameVel = this.vel.copy();
		if(Math.abs(this.vel.x) <= this.slowDown.x * dt * 60) this.vel.x = 0;
		else this.vel.x -= Math.sign(this.vel.x) * this.slowDown.x * dt * 60;
	}

	collision(that, dt) {
		var relv = this.vel.sub(that.vel);
		var bigBox = new PhysicPrimitive();
		bigBox.pos = this.pos.min(this.updatePosition(relv, dt));
		bigBox.size = this.pos.max(this.updatePosition(relv, dt)).add(this.size).sub(bigBox.pos);
		var retVal = {};
		if (bigBox.intersects(that)) {
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
				entry.x = (invEntry.x > 0 ? 1 : -1) * (dt + 1);
				exit.x = (invExit.x > 0 ? 1 : -1) * (dt + 1);
			} else {
				entry.x = invEntry.x / relv.x;
				exit.x = invExit.x / relv.x;
			}
			if (relv.y == 0) {
				entry.y = (invEntry.y > 0 ? 1 : -1) * (dt + 1);
				exit.y = (invExit.y > 0 ? 1 : -1) * (dt + 1);
			} else {
				entry.y = invEntry.y / relv.y;
				exit.y = invExit.y / relv.y;
			}
			var entryTime = Math.max(entry.x, entry.y);
			var exitTime = Math.min(exit.x, exit.y);
			var normal = new Vector2(1, 1);
			if (entryTime > exitTime || entry.x < -eps && entry.y < -eps || entry.x - dt > eps || entry.y - dt > eps) {
				retVal.dt = dt + 1;
				retVal.proj = new Vector2(1, 1);
				return retVal;
			} else {
				if (entry.x - eps > entry.y) {
					if (relv.x >= 0) {
						normal = new Vector2(-1, 0);
					} else {
						normal = new Vector2(1, 0);
					}
				} else {
					if (relv.y >= 0) {
						normal = new Vector2(0, -1);
					} else {
						normal = new Vector2(0, 1);
					}
				}
				retVal.dt = entryTime;
				retVal.proj = normal;
				return retVal;
			}
		}
		else {
			retVal.dt = dt + 1;
			retVal.proj = new Vector2(1, 1);
			return retVal;
		}
	}

	intersects(that) {
		return   !(that.pos.x > this.pos.x + this.size.x
				|| that.pos.x + that.size.x < this.pos.x
				|| that.pos.y > this.pos.y + this.size.y
				|| that.pos.y + that.size.y < this.pos.y);
	}

	resolveIntersection(that) {
		if(this.intersects(that)) {
			var leastProj = new Vector2(this.pos.x + this.size.x - that.pos.x, this.pos.y + this.size.y - that.pos.y);
			var greatProj = new Vector2(that.pos.x + that.size.x - this.pos.x, that.pos.y + that.size.y - this.pos.y);
			var mxVal = Math.max(Math.max(Math.max(leastProj.x, leastProj.y), greatProj.x), greatProj.y);
			if(leastProj.x < 0) leastProj.x = mxVal + 1;
			if(leastProj.y < 0) leastProj.y = mxVal + 1;
			if(greatProj.x < 0) greatProj.x = mxVal + 1;
			if(greatProj.y < 0) greatProj.y = mxVal + 1;
			var mnVal = Math.min(Math.min(Math.min(leastProj.x, leastProj.y), greatProj.x), greatProj.y);
			if(mnVal == mxVal + 1) {
				return;
			}
			if(leastProj.x == mnVal) {
				this.pos.x -= leastProj.x;
			}
			else if(leastProj.y == mnVal) {
				this.pos.y -= leastProj.y;
			}
			else if(greatProj.x == mnVal) {
				this.pos.x += greatProj.x;
			}
			else if(greatProj.y == mnVal){
				this.pos.y += greatProj.y;
			}
		}
	}

	resolveObjects(objects, collisionDataFirst) {
		var ids = [];
		var self = this;
		var collisionDataEnd = {}
		var dt = collisionDataFirst.dt;
		collisionDataEnd.dt = collisionDataFirst.dt;
		collisionDataEnd.proj = new Vector2(1, 1);
		objects.forEach(function(plObj, i, arr) {
			var platform = plObj;
			if(platform.pos == undefined) {
				platform = plObj.physics;	
			}
			self.resolveIntersection(platform);
			var collisionData = self.collision(platform, collisionDataEnd.dt);
			if(Math.abs(collisionData.dt - collisionDataEnd.dt) <= eps) {
				ids.push(i);
			}
			else if(collisionData.dt <= collisionDataEnd.dt && 
				(collisionDataFirst.proj.x && collisionData.proj.y == 0 || 
					collisionDataFirst.proj.y && collisionData.proj.x == 0)) {
				collisionDataEnd = collisionData;
				ids = [i];
			}
		});
		collisionDataEnd.dt = Math.max(0, Math.min(dt, collisionDataEnd.dt));
		collisionDataEnd.obj = ids;
		return collisionDataEnd;
	}

	updateByCollisionData(data, objects, used, self) {
		var projVec = new Vector2(data.proj.y, data.proj.x);
		this.standing = this.standing || data.proj.y == -1;
		this.pos = this.updatePosition(this.vel, data.dt - eps);
		this.vel = this.vel.mul(projVec.mul(projVec));

		data.obj.forEach(function(item, i, arr) {
			if(!used[item]) {
				self.onCollision(objects[item]);
			}
			used[item] = true;
		});
	}

	resolveCollision(objects, dt, self) {
		this.standing = false;

		var used = [];
		used.length = objects.length;
		used.fill(false);

		var collisionData = {dt: dt, proj: new Vector2(this.vel.x, this.vel.y)};
		while(Math.abs(collisionData.dt) > eps) {
			dt = collisionData.dt;
			collisionData = this.resolveObjects(objects, collisionData);
			this.updateByCollisionData(collisionData, objects, used, self);
			collisionData.proj = new Vector2(this.vel.x, this.vel.y);
			collisionData.dt = dt - collisionData.dt;
		}
	}

	set pos(npos) {
		this._pos = npos;
		this._rpos = npos.div(this.rscale);
	}
	
	set rpos(npos) {
		this._rpos = npos;
		this._pos = npos.mul(this.rscale);
	}

	get pos() {
		return this._pos;
	}

	get rpos() {
		return this._rpos;
	}
}

class Player {
	constructor(network, map) {
		this.keys = {};
		this.id = network.roomId;

		this.physics = new PhysicPrimitive();
		this.physics.pos = new Vector2(((network.gameId + 1) * 2000 - 1000) % (mapSize.x * CellSize.x), 0);
		this.physics.size = new Vector2(15, 21);
		this.physics.acc = new Vector2(0, this.physics.g);
		this.physics.onCollision = this.onCollision;
		this.network = network;
		this.map = map;
		this.room = 0;

		this.mousePos = new Vector2(0, 0);
		this.mouseUpdated = false;

		this.workers = 3;
		this.energy = 100;
		this.stone = 100;
		this.iron = 100;
		this.hp = 100;

		this.alive = true;

		this.lastDamageTime = 0;
	}

	processKeys(dt) {
		var coef = 1;
		if(this.lastDamageTime < 1) coef = 0.3;
		else if(this.lastDamageTime < 1.5) coef = this.lastDamageTime - 0.7;
		if (this.keys['a']) {
			this.physics.vel.x += coef * Math.min(0, Math.max(-100 * 60 * dt, -150 * 60 * dt - this.physics.vel.x));
		}
		else if (this.keys['d']) {
			this.physics.vel.x += coef * Math.max(0, Math.min(100 * 60 * dt, 150 * 60 * dt - this.physics.vel.x));
		}

		if ((this.keys['w'] || this.keys[' ']) && this.physics.standing) {
			this.physics.vel.y = -400;
		}
		
		if(this.mouseUpdated) {
			var rpos = this.mousePos.div(CellSize);
			rpos.x = Math.floor(rpos.x);
			rpos.y = Math.floor(rpos.y);
			if(this.mouseButton == 0) {
				if(this.map.checkCoords(rpos.x, rpos.y) && this.workers >= 1) {
					var block = this.map.get(rpos.x, rpos.y);
					var dist = block.physics.rpos.add(new Vector2(1 / 2, 1 / 2)).sub(this.physics.rpos.add(this.physics.size.diva(CellSize.x * 2))).abs();
					if(dist <= 5 && this.energy >= block.energyCost) { 
						if(this.map.breakBlock(rpos.x, rpos.y, {gameId: this.network.gameId, side: this.network.side})) {
							this.workers--;
							if(!block.needBlock) this.energy -= block.energyCost;
						}
					}
				}
			}
			else if(this.mouseButton == 2) {
				if(this.map.checkCoords(rpos.x, rpos.y) && this.workers >= 1 && this.energy >= 5 && this.stone >= 5) {
					var block = this.map.get(rpos.x, rpos.y);
					var dist = block.physics.rpos.add(new Vector2(1 / 2, 1 / 2)).sub(this.physics.rpos.add(this.physics.size.diva(CellSize.x * 2))).abs();
					if(dist <= 5) {
						var good = true;
						rooms[this.network.room].players.forEach(function(item, i, arr) {
							good = good && !block.physics.intersects(item.physics) && item.alive;
						});
						if(good && block.id == 0) {
							block.id = 2;
							this.energy -= 5;
							this.stone -= 5;
							this.map.updateBlock(Math.floor(rpos.x), Math.floor(rpos.y));
						}
					}
				}
			}
			this.mouseUpdated = false;
		}
	}

	onCollision(block) {
		if(block.damage && this.lastDamageTime >= 1) {
			this.physics.vel.y = -300;
			this.hp -= block.damage;
			this.lastDamageTime = 0;
		}
	}

	tickUpdate(dt) {
		//Pre update
		this.processKeys(dt);
		this.physics.vel = this.physics.updateSpeed(dt);
		this.physics.standing = false;
		
		//Collision
		var collisionObjects = [];
		var iPos = this.physics.rpos.mula(1);
		iPos.x = Math.floor(iPos.x);
		iPos.y = Math.floor(iPos.y);
		iPos = this.map.getChunkID(iPos.x, iPos.y);
		var self = this;
		var checkAdd = function (ip) {
			if(ip.x >= 0 && ip.y >= 0 && ip.x < mapSize.x / chunkSize && ip.y < mapSize.y / chunkSize) {
				self.map.map[ip.x][ip.y].getStaticObj(collisionObjects);
			}
		}
		for (let i = -1; i <= 1; i++) {
			for (let j = -1; j <= 1; j++) {
				checkAdd(iPos.add(new Vector2(i, j)));
			}
		}
		var boundingBox = new PhysicPrimitive();
		boundingBox.pos = new Vector2(-1000, -1000);
		boundingBox.size = new Vector2(1000, 2000 + mapSize.y * CellSize.y);
		collisionObjects.push(boundingBox);
		boundingBox = new PhysicPrimitive();
		boundingBox.pos = new Vector2(-1000, mapSize.y * CellSize.y);
		boundingBox.size = new Vector2(2000 + mapSize.x * CellSize.x, 1000);
		collisionObjects.push(boundingBox);
		boundingBox = new PhysicPrimitive();
		boundingBox.pos = new Vector2(mapSize.x * CellSize.x, -1000);
		boundingBox.size = new Vector2(1000, 2000 + mapSize.y * CellSize.y);
		collisionObjects.push(boundingBox);
		this.physics.resolveCollision(collisionObjects, dt, this);

		//Additional
		this.physics.brakes(dt);
		this.hp = Math.max(Math.min(100, this.hp), 0);
		this.alive = this.hp > 0;
		this.lastDamageTime += dt;
		this.lastDamageTime = Math.min(10, this.lastDamageTime);
	}
}

class Virus {
	constructor(network, map) {
		this.keys = {};
		this.id = network.roomId;

		this.network = network;

		this.mousePos = new Vector2(0, 0);
		this.mouseUpdated = false;

		this.workers = 3;
		this.energy = 100;
		this.stone = 100;
		this.iron = 100;
		this.map = map;
		this.room = 0;

		this.pos = new Vector2(((network.gameId + 1) * 2000 - 1000 + network.gameId) % (mapSize.x * CellSize.x), mapSize.y * CellSize.y / 2 + 10);
		var rpos = this.pos.div(CellSize).round();
		this.core = map.get(rpos.x, rpos.y);
		this.core.id = 13;
		this.core.owner = this.id;
		this.alive = true;
		this.map.emitBlock(rpos.x, rpos.y);
	}

	isGood(mid) {
		for (let i = -4; i <= 4; i++) {
			for (let j = -4; j <= 4; j++) {
				if(this.map.checkCoords(mid.x + i, mid.y + j) && this.map.get(mid.x + i, mid.y + j).owner == this.id && this.map.get(mid.x + i, mid.y + j).active) {
					return true;
				}
			}
		}
		return false;
	}

	checkPos(vpos) {
		var npos = vpos.max(screenSize.div(2)).min(mapSize.mul(CellSize).sub(screenSize.div(2)));
		var mid = npos.div(CellSize).round();
		var good = this.isGood(mid);
		if(!good) {
			var temp = mid.x;
			var rpos = this.pos.div(CellSize);
			mid.x = Math.floor(rpos.x);
			good = this.isGood(mid);
			if(good) {
				npos.x = this.pos.x;
			}
			if(!good) {
				mid.x = temp;
				mid.y = Math.floor(rpos.y);
				good = this.isGood(mid);
				if(good) {
					npos.y = this.pos.y;
				}
			}
		}
		if(good) {
			return npos;
		}
		else {
			return new Vector2(-1, -1);
		}
	}

	processPos(npos) {
		var tpos = this.checkPos(npos);
		if(tpos.x < 0) {
			tpos = this.checkPos(this.pos);
			if(tpos.x < 0) {
				let used = {};
				let p = 0;
				let queue = [];
				let pos = this.pos.div(CellSize).round();
				used[pos.x + pos.y * mapSize.x] = true;
				queue.push(pos);
				let shift = [new Vector2(-1, 0), new Vector2(1, 0), new Vector2(0, -1), new Vector2(0, 1)];
				let answ = this.pos;
				while(p < queue.length) {
					let cur = queue[p];
					if(this.isGood(cur)) {
						answ = cur;
						break;
					}
					p++;
					for(let i = 0; i < 4; i++) {
						let tmp = cur.add(shift[i]);
						let id = tmp.x + tmp.y * mapSize.x;
						if(!used[id] && this.map.checkCoords(tmp.x, tmp.y)) {
							used[id] = true;
							queue.push(tmp);
						}
					}
				}
				return answ.mul(CellSize);
			}
			else {
				return this.pos;
			}
		}
		else {
			return tpos;
		}
	}

	processKeys(dt) {
		var npos = this.pos.copy();
		if (this.keys['a']) {
			npos.x -= dt * 200;
		}
		else if (this.keys['d']) {
			npos.x += dt * 200;
		}
		if (this.keys['w']) {
			npos.y -= dt * 200;
		}
		else if (this.keys['s']) {
			npos.y += dt * 200;
		}

		this.pos = this.processPos(npos);
		if(this.mouseUpdated) {
			var rpos = this.mousePos.div(CellSize).round();
			var neighbour = false;
			let shift = [new Vector2(0, 0), new Vector2(-1, 0), new Vector2(1, 0), new Vector2(0, -1), new Vector2(0, 1)];
			for(let i = 0; i < 5; i++) {
				var t = rpos.add(shift[i]);
				if(this.map.checkCoords(t.x, t.y) && this.map.get(t.x, t.y).owner == this.id) {
					neighbour = true;
					break;
				}
			}
			if(neighbour) {
				if(this.mouseButton == 0) {
					if(this.map.checkCoords(rpos.x, rpos.y) && this.workers >= 1) {
						var block = this.map.get(rpos.x, rpos.y);
						//var dist = block.physics.rpos.add(new Vector2(1 / 2, 1 / 2)).sub(this.physics.rpos.add(this.physics.size.diva(CellSize.x * 2))).abs();
						if(this.energy >= block.energyCost || (block.id == 12 && this.energy >= block.energyCost / 10)) { 
							if(this.map.breakBlock(rpos.x, rpos.y, {gameId: this.network.gameId, side: this.network.side})) {
								this.workers--;
								if(block.id == 12) this.energy -= block.energyCost / 10;
								else if(!block.needBlock) this.energy -= block.energyCost;
							}
						}
					}
				}
				else if(this.mouseButton == 2) {
					if(this.map.checkCoords(rpos.x, rpos.y) && this.workers >= 1 && this.energy >= 5 && this.stone >= 5) {
						var block = this.map.get(rpos.x, rpos.y);
						//var dist = block.physics.rpos.add(new Vector2(1 / 2, 1 / 2)).sub(this.physics.rpos.add(this.physics.size.diva(CellSize.x * 2))).abs();
						//if(dist <= 5) {
							var good = true;
							rooms[this.network.room].players.forEach(function(item, i, arr) {
								good = good && !block.physics.intersects(item.physics) && item.alive;
							});
							if(good && block.id == 0) {
								block.id = 12;
								block.owner = this.id;
								this.energy -= 5;
								this.stone -= 5;
								this.map.updateBlock(Math.floor(rpos.x), Math.floor(rpos.y));
							}
						//}
					}
				}
			}
			this.mouseUpdated = false;
		}
	}

	tickUpdate(dt) {
		this.processKeys(dt);

		if(this.core.id != 13 || this.core.owner != this.id) {
			this.alive = false;
		}
	}
}

class Block {
	constructor(map) {
		this.map = map;
		this.physics = new PhysicPrimitive();
		this.physics.size = new Vector2(0, 0).add(CellSize);
		this.id = 0;
		this.solid = false;
		this.needBlock = false;
		this.name = '';
		this.energyCost = 0;
		this.stoneCost = 0;
		this.textureOffset = new Vector2(0, 0);
		this.multiTexture = 0;
		this.multiTextureId = 8;
		this.damage = 0;
		this.owner = -1;

		this.breakable = false;
		this.isBreaking = false;
		this.breakTime = 0;
		this.koef = 1;
		this.breakTimer = 0;
		this.active = 1;
	}

	update(dt) {
		var result = {};
		result.update = false;
		result.changed = false;
		if(this.isBreaking) {
			this.breakTimer += dt;
			if(this.breakTimer >= this.breakTime / this.koef) {
				this.isBreaking = false;
				result.changed = true;
			}
		}
		result.update = this.isBreaking;
		return result;
	}

	generateData() {
		var obj = {};
		obj.pos = this.physics.pos;
		obj.rpos = this.physics.rpos;
		obj.id = this.id;
		obj.solid = this.solid;
		obj.breakable = this.breakable;
		obj.breakTime = this.breakTime;
		obj.name = this.name;
		obj.textureOffset = this.textureOffset;
		obj.multiTexture = this.multiTexture;
		obj.multiTextureId = this.multiTextureId;
		obj.owner = this.owner;
		obj.active = this.active;
		return obj;
	}

	updateMultiTexture() {
		if(this.multiTexture) {
			var type = 8;
			var self = this;
			var onlyMe = this.id == 12;
			var check = function(i, j) {
				return self.map.checkCoords(i, j) && (!self.map.get(i, j).solid && !onlyMe || (self.map.get(i, j).id != self.id && self.map.get(i, j).id != 13) && onlyMe);
			}
			var x = this.physics.rpos.x;
			var y = this.physics.rpos.y;
			var neigh = check(x, y - 1) * 8 + check(x + 1, y) * 4 + check(x, y + 1) * 2 + check(x - 1, y);
			var seq = undefined;
			if(this.multiTexture == 1) {
				seq = [1, 0, 1, 0, 2, 1, 2, 1, 1, 0, 1, 0, 2, 1, 2, 1];
			}
			else if(this.multiTexture == 2) {
				seq = [8, 7, 5, 6, 3, 8, 4, 5, 1, 0, 8, 7, 2, 1, 3, 8];
			}
			else {
				seq = [8, 7, 5, 6, 3, 13, 4, 11, 1, 0, 14, 12, 2, 9, 10, 15];
			}
			type = seq[neigh];
			if(type != this.multiTextureId && this.id == 12) {
				this.multiTextureId = type;
				this.map.emitBlock(x, y);
			}
			this.multiTextureId = type;
		}
	}

	updateBlockTexture() {
		let cur = new Vector2(this.physics.rpos.x, this.physics.rpos.y);
		let shift = [new Vector2(0, 0), new Vector2(-1, 0), new Vector2(1, 0), new Vector2(0, -1), new Vector2(0, 1)];
		for(let i = 0; i < 5; i++) {
			let tmp = cur.add(shift[i]);
			if(this.map.checkCoords(tmp.x, tmp.y) && this.map.get(tmp.x, tmp.y).id == 12) {
				this.map.get(tmp.x, tmp.y).updateMultiTexture();
			}
		}
	}

	set id(nid) {
		var updTex = nid == 12 || this._id == 12;
		this._id = nid;
		var info = blockInfo[nid];
		this.solid = info.solid;
		this.breakable = info.breakable;
		this.breakTime = info.breakTime;
		this.energyCost = info.energyCost;
		this.stoneCost = info.stoneCost;
		this.needBlock = info.needBlock;
		this.name = info.name;
		this.textureOffset = info.textureOffset;
		this.multiTexture = info.multiTexture;
		this.multiTextureId = 8;
		this.damage = info.damage;
		this.owner = -1;
		if(updTex) this.updateBlockTexture();
	}

	get id() {
		return this._id;
	}
}

class Chunk {
	constructor(rpos, map) {
		this.physics = new PhysicPrimitive();
		this.physics.rscale = new Vector2(chunkSize, chunkSize);
		this.physics.rpos = new Vector2(0, 0).add(rpos);
		this.physics.size = new Vector2(chunkSize, chunkSize);
		this.chunk = [];
		this.map = map;
		for(let i = 0; i < chunkSize; i++) {
			this.chunk.push([]);
			for(let j = 0; j < chunkSize; j++) {
				this.chunk[i].push(new Block(map));
				this.chunk[i][j].physics.rpos = new Vector2(i, j).add(this.physics.pos);1
			}
		}
	}

	getStaticObj(arr) {
		this.chunk.forEach(function(row, i, carr) {
			row.forEach(function(block, j, rarr) {
				if(block.solid) {
					arr.push(block);
				}
			});
		});
	}

	updateMultiTexture() {
		this.chunk.forEach(function(row, i, arr) {
			row.forEach(function(item, j, rarr) {
				item.updateMultiTexture();
			})
		});
	}

	generateData() {
		var data = [];
		this.chunk.forEach(function(row, i, arr) {
			data.push([]);
			row.forEach(function(item, j, rarr) {
				data[i].push(item.generateData());
			});
		});
		return data;
	}

	get(i, j) {
		return this.chunk[i - this.physics.pos.x][j - this.physics.pos.y];
	}
	set(i, j, val) {
		this.chunk[i - this.physics.pos.x][j - this.physics.pos.y] = val;
	}
}

var perlinNoise = new function() {
	this.noise = function(x, y, z) {
		var p = new Array(512);
		var permutation = [151, 160, 137, 91, 90, 15,
			131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
			190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
			88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
			77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
			102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
			135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
			5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
			223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
			129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
			251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
			49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
			138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
		];
		for (var i = 0; i < 256; i++)
			p[256 + i] = p[i] = permutation[i];

		var X = Math.floor(x) & 255, // FIND UNIT CUBE THAT
			Y = Math.floor(y) & 255, // CONTAINS POINT.
			Z = Math.floor(z) & 255;
		x -= Math.floor(x); // FIND RELATIVE X,Y,Z
		y -= Math.floor(y); // OF POINT IN CUBE.
		z -= Math.floor(z);
		var u = fade(x), // COMPUTE FADE CURVES
			v = fade(y), // FOR EACH OF X,Y,Z.
			w = fade(z);
		var A = p[X] + Y,
			AA = p[A] + Z,
			AB = p[A + 1] + Z, // HASH COORDINATES OF
			B = p[X + 1] + Y,
			BA = p[B] + Z,
			BB = p[B + 1] + Z; // THE 8 CUBE CORNERS,

		return scale(lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), // AND ADD
					grad(p[BA], x - 1, y, z)), // BLENDED
				lerp(u, grad(p[AB], x, y - 1, z), // RESULTS
					grad(p[BB], x - 1, y - 1, z))), // FROM  8
			lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), // CORNERS
					grad(p[BA + 1], x - 1, y, z - 1)), // OF CUBE
				lerp(u, grad(p[AB + 1], x, y - 1, z - 1),
					grad(p[BB + 1], x - 1, y - 1, z - 1)))));
	}

	function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

	function lerp(t, a, b) { return a + t * (b - a); }

	function grad(hash, x, y, z) {
		var h = hash & 15; // CONVERT LO 4 BITS OF HASH CODE
		var u = h < 8 ? x : y, // INTO 12 GRADIENT DIRECTIONS.
			v = h < 4 ? y : h == 12 || h == 14 ? x : z;
		return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
	}

	function scale(n) { return (1 + n) / 2; }
}

class GameMap {
	constructor(room) {
		this.room = room;
		this.map = [];
		this.updateQueue = [];
		for(let i = 0; i < mapSize.x / chunkSize; i++) {
			this.map.push([]);
			for(let j = 0; j < mapSize.y / chunkSize; j++) {
				this.map[i].push(new Chunk(new Vector2(i, j), this));
			}
		}
	}

	recreate() {
		this.updateQueue.length = 0;
		for(let i = 0; i < mapSize.x / chunkSize; i++) {
			this.map[i].length = 0;
			for(let j = 0; j < mapSize.y / chunkSize; j++) {
				this.map[i].push(new Chunk(new Vector2(i, j), this));
			}
		}
	}

	generateMap() {
		var height = [];
		var seed = Math.random() * 10;
		var yOffset = 25;
		var self = this;		
		for(let i = 0; i < mapSize.x; i++) {
			height.push(Math.floor(perlinNoise.noise(i / 10, seed, seed) * maxHeight + 1));
		}
		for(let i = 0; i < mapSize.x; i++) {
			for(let j = 0; j < maxHeight + 1; j++) {
				if(height[i] >= maxHeight - j) {
					var curRand = Math.random() * 100;
					if(curRand < 50) {
						var flower = Math.min(5, Math.floor(Math.random() * 6));
						this.get(i, j - 1 + yOffset).id = 4 + flower;
					}
					else if(curRand < 60) {
						this.get(i, j - 1 + yOffset).id = 11;
					}
					this.get(i, j + yOffset).id = 1;
					this.get(i, j + 1 + yOffset).id = 2;
					this.get(i, j + 2 + yOffset).id = 2;
					var curRand = Math.random() * 10;
					if(curRand <= 5) {
						this.get(i, j + 3 + yOffset).id = 2;
						if(curRand <= 2) {
							this.get(i, j + 4 + yOffset).id = 2;
						}
					}
					break;
				}
			}
			for(let j = 1; j < maxHeight + 2 + yOffset; j++) {
				if(this.get(i, j - 1).id >= 1 && this.get(i, j).id == 0) {
					this.get(i, j).id = 3;
				}
			}
			for(let j = maxHeight + 2 + yOffset; j < mapSize.y; j++) {
				var curNoise = perlinNoise.noise(i / 10, j / 10, seed) * 100;
				if(curNoise <= Math.max(60, 100 - j)) {
					this.get(i, j).id = 3;
				}
			}
		}
		var withoutTree = 0;
		for(let i = 0; i < mapSize.x; i++) {
			if(this.checkCoords(i - 1, 0) && this.checkCoords(i + 1, 0)) {
				for(let j = yOffset; j < mapSize.y; j++) {
					if(this.get(i, j).id == 1) {
						if(this.get(i - 1, j).id == 1 && this.get(i + 1, j).id == 1) {
							if(Math.random() * 100 <= withoutTree) {
								this.get(i, j - 1).id = 10;
								withoutTree = -2;
							}
						}
						break;
					}
				}
			}
			withoutTree++;
			for(let j = maxHeight + 1 + yOffset; j < mapSize.y; j++) {
				var check = function(a, b) {
					return (self.checkCoords(a, b) && self.get(a, b).id == 0);
				}
				var count = check(i - 1, j) || check(i + 1, j) || check(i, j - 1) || check(i, j + 1);
				if(count && this.get(i, j).id != 0) {
					this.get(i, j).id = 2;
				}
			}
		}
		this.map.forEach(function(row, i, arr) {
			row.forEach(function(item, j, rarr) {
				item.updateMultiTexture();
			});
		});
	}

	checkCoords(i, j) {
		return i != undefined && j != undefined && i >= 0 && j >= 0 && i < mapSize.x && j < mapSize.y;
	}

	getChunk(i, j) {
		return this.map[Math.floor(i / chunkSize)][Math.floor(j / chunkSize)];
	}

	getChunkID(i, j) {
		return new Vector2(Math.floor(i / chunkSize), Math.floor(j / chunkSize));
	}

	get(i, j) {
		return this.getChunk(i, j).get(i, j);
	}

	set(i, j, val) {
		this.getChunk().set(i, j, val);	
	}

	emitChunk(i, j, socket = undefined) {
		if(socket == undefined) {
			io.to('room' + this.room).emit('map-chunk', {chunk: this.map[i][j].generateData(), pos: this.map[i][j].physics._pos});
		}
		else {
			socket.emit('map-chunk', {chunk: this.map[i][j].generateData(), pos: this.map[i][j].physics._pos});
		}
	}

	emitBlock(i, j, socket = undefined) {
		if(socket == undefined) {
			io.to('room' + this.room).emit('blockUpdate', this.get(i, j).generateData());
		}
		else {
			socket.emit('blockUpdate', this.get(i, j).generateData());
		}
	}

	emitMap(socket = undefined) {
		var self = this;
		this.map.forEach(function(row, i, arr) {
			row.forEach(function(item, j, rarr) {
				self.emitChunk(i, j, socket);
			});
		});
	}

	updateBlock(i, j, info = undefined) {
		this.updateQueue.push({rpos: new Vector2(i, j), info: info});
	}

	breakBlock(i, j, info) {
		var block = this.get(i, j);
		if(block.breakable && !block.isBreaking){
			block.isBreaking = true;
			block.breakTimer = 0;
			block.koef = 1;
			if(info.side && block.id == 12) block.koef = 10;
			io.to('room' + this.room).emit('blockBreaking', block.physics.rpos, block.koef);
			this.updateBlock(i, j, info);
			return true;
		}
		return false;
	}

	onBreaking(i, j, source) {
		var block = this.get(i, j);
		var stoneCost = block.stoneCost;
		var pl;
		if(source.side == 0) pl = rooms[this.room].players[source.gameId];
		else pl = rooms[this.room].viruses[source.gameId];
		if(pl) {
			pl.workers++;
			pl.stone += stoneCost;
		}
		if(this.checkCoords(i, j - 1) && this.get(i, j - 1).needBlock) {
			this.breakBlock(i, j - 1, source);
			if(pl) {
				pl.workers--;
			}
		}
		// if(block.owner >= 0) {
		// 	var owner = rooms[this.room].network[block.owner];
		// 	if(owner.side == 0) {
		// 		owner = rooms[owner.room].players[owner.gameId];
		// 	}
		// 	else {
		// 		owner = rooms[owner.room].viruses[owner.gameId];

		// 		if(owner.core.rpos.x == i && owner.core.rpos.y == j) {
		// 			owner.alive = false;
		// 		}
		// 	}
		// }
		block.id = 0;
	}

	update(dt) {
		var nq = [];
		var self = this;
		for(let it = 0; it < this.updateQueue.length; it++) {
			var item = this.updateQueue[it];
			var i = item.rpos.x;
			var j = item.rpos.y;
			var block = self.get(i, j);
			var res = block.update(dt);
			if(res.update) {
				nq.push(item);
			}
			if(res.changed) {
				this.onBreaking(i, j, item.info);
			}
			if(!res.update || res.changed) {
				self.emitBlock(i, j);
			}
		}
		this.updateQueue = nq;
	}
}

class Room {
	constructor(id) {
		this.id = id;
		this.players = [];
		this.viruses = [];
		this.network = [];

		this.restart();
	}

	restart() {
		var first = this.map == undefined;
		if(!first) {
			this.network.forEach(function(item, i, arr) {
				item.room = -1;
				item.roomId = -1;
				item.ready = false;
			});
		}
		else {
			this.map = new GameMap(this.id);
			this.map.generateMap();
		}
		if(this.id > 0) {
			this.map.recreate();
		}
		this.players.length = 0;
		this.viruses.length = 0;
		this.network.length = 0;;
		this.cntSides = [0, 0];
		this.started = false;
		this.startedTime = new Date();
		this.online = 0;
		if(!first) log('Room ' + this.id + ' stoped');
		emitRooms();
	}

	start() {
		var self = this;
		if(this.id > 0) {
			this.map.generateMap();
		}
		this.network.forEach(function(item, i, arr) {
			if(item.side == 0) {
				item.gameId = self.players.length;
				var player = new Player(item, self.map);
				self.players.push(player);
			}
			else {
				item.gameId = self.viruses.length;
				var player = new Virus(item, self.map);
				self.viruses.push(player);
			}
			item.socket.emit('gameStarted', item.side, item.gameId);
		});
		this.started = true;
		this.startedTime = new Date();
		log('Room ' + this.id + ' started');
		emitRooms();
	}

	emitRoom() {
		var data = [];
		this.network.forEach(function(net, i, arr) {
			var item = {};
			item.id = net.id;
			item.name = net.name;
			item.side = net.side;
			item.ready = net.ready;
			data.push(item);
		});
		emitRooms();
		io.to('room' + this.id).emit('updateRoom', data, this.id);
	}

	updatePreGame(dt) {
		var allReady = true;
		this.network.forEach(function(net, i, arr) {
			allReady = allReady && net.ready;
		});
		if(allReady && /*this.cntSides[0] >= 1 && this.cntSides[1] >= 1 &&*/ this.network.length >= 1) {
			this.start();
		}
	}

	updateGame(dt) {
		this.online = 0;
		var data = [];
		var self = this;
		this.players.forEach(function (player, i, arr) {
			self.online += !player.network.left && player.alive;
			//Processing physics
			player.tickUpdate(dt);

			player.energy += dt * 2;
			//Data for transfer
			var iData = {};
			iData.id = player.id;
			iData.physics = player.physics;
			iData.name = player.network.name;
			iData.workers = player.workers;
			iData.energy = player.energy;
			iData.stone = player.stone;
			iData.iron = player.iron;
			iData.hp = player.hp;
			if(!player.alive) {
				player.network.room = -1;
				player.network.roomId = -1;
				player.network.ready = false;
				player.network.socket.emit('gameOver');
			}
			else {
				data.push(iData);
			}
		});
		this.viruses.forEach(function (virus, i, arr) {
			self.online += !virus.network.left && virus.alive;
			//Processing physics
			virus.tickUpdate(dt);

			virus.energy += dt * 2;
			//Data for transfer
			var iData = {};
			iData.pos = virus.pos;
			iData.workers = virus.workers;
			iData.energy = virus.energy;
			iData.stone = virus.stone;
			iData.iron = virus.iron;
			if(!virus.alive) {
				virus.network.room = -1;
				virus.network.roomId = -1;
				virus.network.ready = false;
				virus.network.socket.emit('gameOver');
			}
			else {
				virus.network.socket.emit('update-virus', iData);
			}
		});
		this.map.update(dt);
		if(!this.online || new Date() - this.startedTime >= 1000 * 60 * 15) {
			io.to('room' + this.id).emit('gameOver');
			this.network.forEach(function(item, i, arr) {
				item.room = -1;
				item.roomId = -1;
				item.ready = false;
			});
			this.restart();
			return;
		}

		io.to('room' + this.id).emit('update', data);
	}

	tick(dt) {
		if(!this.started) {
			this.updatePreGame(dt);
		}
		else {
			this.updateGame(dt);
		}
	}
}

function setup() {
	for(let i = 0; i < 3; i++) {
		rooms.push(new Room(i));
	}
	setInterval(tick, 16);
	setInterval(updatePlayers, 1000 * 60 * 30);
	log(new Date().toString());
	log("Server version: " + version);
	log("Server started successfully");
}

function loadFiles() {
	fs.readFile(path + 'server/res/blockInfo.csv', 'utf8', function(err, data) {
		if(err) {
			log("Error reading blockInfo file", 2);
			log(err, 2);
		}
		csvParse(data, {delimiter: ';'}, function(errr, output) {
			if(errr) {
				log("Error reading blockInfo file #2", 2);
				log(errr, 2);
			}
			for(let i = 1; i < output.length; i++) {
				var info = {};
				var cur = output[i];
				info.id = Number(cur[0]);
				info.solid = Number(cur[1]);
				info.breakable = Number(cur[2]);
				info.breakTime = Number(cur[3]);
				info.energyCost = Number(cur[4]);
				info.stoneCost = Number(cur[5]);
				info.needBlock = Number(cur[6]);
				info.name = cur[7];
				info.textureOffset = new Vector2(Number(cur[8]), Number(cur[9]));
				info.multiTexture = Number(cur[10]);
				info.damage = Number(cur[11]);
				blockInfo.push(info);
			}
			setup();
		});
	});
}

loadFiles();

var rooms = [];

function tick() {
	var curTime = new Date().getTime();
	var dt = (curTime - lastTickTime) / 1000;
	lastTickTime = curTime;
	if(dt > 0.064) {
		var ticksSkipped = Math.ceil(dt / 0.016);
		log("Server overload: skipping " + ticksSkipped + " ticks", 1);
		dt = 0.064;
	}
	rooms.forEach(function(item, i, arr) {
		item.tick(dt);
	});
}

function updatePlayers() {
	log("Started cleaning up");
	var res = usersNetwork().map(function(record, id) {
		return [record.id, record.network.left && Date.now() - record.network.leftTime >= 1000 * 60 * 60];
	});
	for (id in res) {
		var i = res[id];
		if(i[1]) {
			var network = usersNetwork({id: i[0]}).first().network;
			usersNetwork({id: i[0]}).remove();
			log(network.name + ' (' + network.id + ') erased. Total: ' + usersNetwork().count());
		}
	}
	log("Ended cleaning up");
}