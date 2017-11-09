//Modules
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server, {
	pingInterval: 1000,
	pingTimeout: 10000
});
var jwt = require('jsonwebtoken');
var jwtSecretKey = "supersecrettodochange";
var taffy = require('taffydb');
var fs = require('fs');

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
			socket.emit('reg-success', tok, nid, name);
			console.log(name +  " (" + nid + ") joined the game. Total: " + usersNetwork().count());
		}
	});

	socket.on('requestChunk', function(i, j) {
		map.emitChunk(i, j, socket);
	});

	socket.on('keyboard', function (key, state, token) {
		if(verifyToken(token)) {
			players[usersNetwork({'token': token}).first().id].keys[key] = state;
		}
	});

	socket.on('mouse', function (pos, button, token) {
		if(verifyToken(token)) {
			players[usersNetwork({'token': token}).first().id].mousePos = new Vector2(pos.x, pos.y);
			players[usersNetwork({'token': token}).first().id].mouseUpdated = true;
			players[usersNetwork({'token': token}).first().id].mouseButton = button;
		}
	});

	socket.on('disconnect', function() {
		console.log(socket.id.toString() + " disconnected, total: " + io.engine.clientsCount);
		if(usersNetwork({'socket': socket.id.toString()}).count() > 0) {
			var usr = usersNetwork({'socket': socket.id.toString()}).first();
			var name = players[usr.id].network.nickname;
			var id = usr.id;
			ids[id] = false;
			players[id] = undefined;
			io.to('users').emit('reg-disconnect', id);
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
}

const eps = 1e-6;
const chunkSize = 8;
var mapSize = new Vector2(512, 128);
var CellSize = new Vector2(16, 16);
const maxHeight = 15; 

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

class PhysicPrimitive {
	constructor() {
		this._pos = new Vector2(0, 0);
		this.size = new Vector2(0, 0);
		this.vel = new Vector2(0, 0);
		this.acc = new Vector2(0, 0);
		this.mxvel = new Vector2(0, 0);
		this.pivot = new Vector2(0, 0);
		this._rpos = new Vector2(0, 0);
		this.rscale = CellSize.add(new Vector2(0, 0));
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
		var bigBox = new PhysicPrimitive();
		bigBox.pos = this.pos.min(this.updatePosition(relv, dt));
		bigBox.size = this.pos.max(this.updatePosition(relv, dt)).add(this.size).sub(bigBox.pos);
		if (bigBox.intersectsWithBorders(that)) {
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
			var normal = new Vector2(0, 0);
			if (entryTime > exitTime || entry.x < -eps && entry.y < -eps || entry.x - dt > eps || entry.y - dt > eps) {
				return [dt + 1, normal];
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
				return [entryTime, normal];
			}
		}
		else {
			return [dt + 1, new Vector2(0, 0)];
		}
	}

	intersectsWithBorders(that) {
		return   !(that.pos.x > this.pos.x + this.size.x
				|| that.pos.x + that.size.x < this.pos.x
				|| that.pos.y > this.pos.y + this.size.y
				|| that.pos.y + that.size.y < this.pos.y);
	}

	resolveIntersection(that) {
		if(this.intersectsWithBorders(that)) {
			var leastProj = new Vector2(this.pos.x + this.size.x - that.pos.x, this.pos.y + this.size.y - that.pos.y);
			var greatProj = new Vector2(that.pos.x + that.size.x - this.pos.x, that.pos.y + that.size.y - this.pos.y);
			var mxVal = Math.max(Math.max(Math.max(leastProj.x, leastProj.y), greatProj.x), greatProj.y);
			//console.log([leastProj, greatProj]);
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

	resolveCollision(objects, dt) {
		var collisionDataEnd = [dt + 1, new Vector2(0, 0)];
		var self = this;
		
		objects.forEach(function(plObj, i, arr) {
			var platform = plObj;
			if(platform.pos == undefined) {
				platform = plObj.physics;	
			}
			self.resolveIntersection(platform);
			var collisionData = self.collision(platform, dt);
			if(collisionData[0] <= collisionDataEnd[0]) {
				collisionDataEnd = collisionData;
			}
		});

		if(collisionDataEnd[0] >= -eps && collisionDataEnd[0] <= dt) {
			if(collisionDataEnd[0] <= eps) collisionDataEnd[0] = 0;
			self.standing = collisionDataEnd[1].y == -1;
			self.pos = self.updatePosition(self.vel, collisionDataEnd[0] - 0.000000001);
			var temp = new Vector2(collisionDataEnd[1].y, collisionDataEnd[1].x); 
			self.vel = self.vel.mul(temp.mul(temp));
			var timeLeft = dt - collisionDataEnd[0];
			var collisionDataFirst = [dt - collisionDataEnd[0], new Vector2(0, 0).add(collisionDataEnd[1])];
			collisionDataEnd[0] = collisionDataFirst[0] + 1;
			var iid = -1;
			objects.forEach(function(plObj, i, arr) {
				var platform = plObj;
				if(platform.pos == undefined) {
					platform = plObj.physics;	
				}
				self.resolveIntersection(platform);
				var collisionData = self.collision(platform, collisionDataEnd[0]);
				if(collisionData[0] <= collisionDataEnd[0] && collisionData[1].x * collisionDataFirst[1].x == 0 && collisionData[1].y * collisionDataFirst[1].y == 0) {
					collisionDataEnd = collisionData;
					iid = i;
				}
			});

			if(collisionDataEnd[0] >= -eps && collisionDataEnd[0] <= collisionDataFirst[0]) {
				if(collisionDataEnd[0] <= eps) collisionDataEnd[0] = 0;
				self.collision(objects[iid], dt, true);
				self.standing = self.standing || collisionDataEnd[1].y == -1;
				self.pos = self.updatePosition(self.vel, collisionDataEnd[0]);
				self.vel = new Vector2(0, 0);
			}
			else {
				self.pos = self.updatePosition(self.vel, timeLeft);	
			}
		}
		else {
			self.pos = self.updatePosition(self.vel, dt);	
		}
	}

	set pos(npos) {
		this._pos = npos.sub(this.pivot);
		this._rpos = this._pos.div(this.rscale);
	}
	
	set rpos(npos) {
		this._rpos = npos.sub(this.pivot.div(this.rscale));
		this._pos = this._rpos.mul(this.rscale);
	}

	get pos() {
		return this._pos.add(this.pivot);
	}

	get rpos() {
		return this._rpos.add(this.pivot.div(this.rscale));
	}
}

var debugMovement = false;

class Player {
	constructor(name, id, socket) {
		this.keys = {};
		this.id = id;

		this.physics = new PhysicPrimitive();
		this.physics.pos = new Vector2(500, 0);
		this.physics.size = new Vector2(15, 21);
		this.physics.mxvel = new Vector2(400, 4000);
		if(!debugMovement) this.physics.acc = new Vector2(0, this.physics.g);
		else this.physics.acc = new Vector2(0, 0);

		this.network = new NetworkPrimitive();
		this.network.nickname = name;
		this.network.id = id;
		this.network.socket = socket;

		this.mousePos = new Vector2(0, 0);
		this.mouseUpdated = false;

		this.workers = 3;
		this.energy = 100;
		this.stone = 100;
		this.iron = 100;
	}

	processKeys() {
		if (this.keys['a']) {
			this.physics.vel.x = -125;
		}
		else if (this.keys['d']) {
			this.physics.vel.x = 125;
		}
		else {
			this.physics.vel.x = 0;
		}

		if(!debugMovement) {
			if (this.keys['w'] && this.physics.standing) {
				this.physics.vel.y = -400;
			}
		}
		else {
			if (this.keys['w']) {
				this.physics.vel.y = -200;
			}
			else if (this.keys['s']) {
				this.physics.vel.y = 200;
			}
			else {
				this.physics.vel.y = 0;
			}
		}

		if(this.mouseUpdated) {
			var rpos = this.mousePos.div(CellSize);
			if(this.mouseButton == 0) {
				if(map.checkCoords(rpos.x, rpos.y) && this.workers >= 1 && this.energy >= 10) {
					if(map.get(Math.floor(rpos.x), Math.floor(rpos.y)).breakMe()) {
						this.workers--;
						this.energy -= 10;
						map.updateBlock(Math.floor(rpos.x), Math.floor(rpos.y), [this.id]);
					}
				}
			}
			else if(this.mouseButton == 2) {
				if(map.checkCoords(rpos.x, rpos.y) && this.workers >= 1 && this.energy >= 5 && this.stone >= 10) {
					var block = map.get(Math.floor(rpos.x), Math.floor(rpos.y));
					var good = true;
					players.forEach(function(item, i, arr) {
						if(good && item.physics.intersectsWithBorders(block.physics)) {
							good = false;
						}
					});
					if(good && block.id == 0) {
						block.id = 3;
						this.energy -= 5;
						this.stone -= 10;
						var chunkid = map.getChunkID(Math.floor(rpos.x), Math.floor(rpos.y));
						map.emitChunk(chunkid.x, chunkid.y);
					}
					this.mouseUpdated = false;
				}
			}
			this.mouseUpdated = false;
		}
	}

	tickUpdate(dt) {
		//Pre update
		this.processKeys();
		this.physics.vel = this.physics.updateSpeed(dt);
		this.physics.standing = false;
		
		//Collision
		var collisionObjects = [];
		var iPos = this.physics.rpos.mula(1);
		iPos.x = Math.floor(iPos.x);
		iPos.y = Math.floor(iPos.y);
		iPos = map.getChunkID(iPos.x, iPos.y);
		var checkAdd = function (ip) {
			if(ip.x >= 0 && ip.y >= 0 && ip.x < mapSize.x / chunkSize && ip.y < mapSize.y / chunkSize) {
				map.map[ip.x][ip.y].getStaticObj(collisionObjects);
			}
		}
		checkAdd(iPos.add(new Vector2(0, 0)));
		checkAdd(iPos.add(new Vector2(-1, -1)));
		checkAdd(iPos.add(new Vector2(0, -1)));
		checkAdd(iPos.add(new Vector2(1, -1)));
		checkAdd(iPos.add(new Vector2(-1, 0)));
		checkAdd(iPos.add(new Vector2(1, 0)));
		checkAdd(iPos.add(new Vector2(-1, 1)));
		checkAdd(iPos.add(new Vector2(0, 1)));
		checkAdd(iPos.add(new Vector2(1, 1)));
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
		this.physics.resolveCollision(collisionObjects, dt);
	}
}

class Block {
	constructor() {
		this.physics = new PhysicPrimitive();
		this.physics.size = new Vector2(0, 0).add(CellSize);
		this.id = 0;
		this.solid = false;

		this.breakable = false;
		this.isBreaking = false;
		this.breakTime = 0;
		this.breakTimer = 0;
	}

	update(dt) {
		var changed = false;
		if(this.isBreaking) {
			this.breakTimer += dt;
			if(this.breakTimer >= this.breakTime) {
				this.isBreaking = false;
				this.id = 0;
				changed = true;
			}
		}
		return [this.isBreaking, changed];
	}

	breakMe() {
		if(this.breakable && !this.isBreaking){
			this.isBreaking = true;
			this.breakTimer = 0;
			io.to('users').emit('blockBreaking', this.physics.rpos);
			return true;
		}
		return false;
	}

	set id(nid) {
		this._id = nid;
		if(this._id >= 1) {
			this.solid = true;
			this.breakable = true;
			this.breakTime = (this._id % 2 ? 2 : 4);
		}
		else {
			this.solid = false;
			this.breakable = false;
			this.breakTime = 0;
		}
	}

	get id() {
		return this._id;
	}
}

class Chunk {
	constructor(rpos) {
		this.physics = new PhysicPrimitive();
		this.physics.rscale = new Vector2(chunkSize, chunkSize);
		this.physics.rpos = rpos;
		this.physics.size = new Vector2(chunkSize, chunkSize);
		this.chunk = [];
		for(let i = 0; i < chunkSize; i++) {
			this.chunk.push([]);
			for(let j = 0; j < chunkSize; j++) {
				this.chunk[i].push(new Block());
				this.chunk[i][j].physics.rpos = new Vector2(i, j).add(this.physics.pos);
			}
		}
	}

	getStaticObj(arr) {
		this.chunk.forEach(function(row, i, carr) {
			row.forEach(function(block, j, rarr) {
				if(block.solid) {
					arr.push(block.physics);
				}
			});
		});
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
	constructor() {
		this.map = [];
		this.updateQueue = [];
		for(let i = 0; i < mapSize.x / chunkSize; i++) {
			this.map.push([]);
			for(let j = 0; j < mapSize.y / chunkSize; j++) {
				this.map[i].push(new Chunk(new Vector2(i, j)));
			}
		}
	}

	generateMap() {
		var height = [];
		var seed = Math.random() * 10;
		var yOffset = 15;
		for(let i = 0; i < mapSize.x; i++) {
			height.push(Math.floor(perlinNoise.noise(i / 10, seed, seed) * maxHeight + 1));
		}
		for(let i = 0; i < mapSize.x; i++) {
			for(let j = 0; j < maxHeight + 1; j++) {
				if(height[i] >= maxHeight - j) {
					this.get(i, j + yOffset).id = 1;
					this.get(i, j + 1 + yOffset).id = 3;
					this.get(i, j + 2 + yOffset).id = 3;
					var curRand = Math.random() * 10;
					if(curRand <= 5) {
						this.get(i, j + 3 + yOffset).id = 3;
						if(curRand <= 2) {
							this.get(i, j + 4 + yOffset).id = 3;
						}
					}
					break;
				}
			}
			for(let j = 1; j < maxHeight + 2 + yOffset; j++) {
				if(this.get(i, j - 1).id >= 1 && this.get(i, j).id == 0) {
					this.get(i, j).id = 2;
				}
			}
			for(let j = maxHeight + 2 + yOffset; j < mapSize.y; j++) {
				var curNoise = perlinNoise.noise(i / 10, j / 10, seed) * 100;
				if(curNoise <= Math.max(60, 100 - j)) {
					if(Math.random() * 100 <= 1) {
						this.get(i, j).id = 4;
					}
					else {
						this.get(i, j).id = 2;
					}
				}
			}
		}
	}

	checkCoords(i, j) {
		return i >= 0 && j >= 0 && i < mapSize.x && j < mapSize.y;
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
		if(!socket) {
			io.to('users').emit('map-chunk', this.map[i][j]);
		}
		else {
			socket.emit('map-chunk', this.map[i][j]);
		}
	}

	emitMap(socket = undefined) {
		var self = this;
		this.map.forEach(function(row, i, arr) {
			row.forEach(function(item, j, rarr) {
				self.emitChunk(i, j);
			});
		});
	}

	updateBlock(i, j, info) {
		this.updateQueue.push([i, j, info]);
	}

	update(dt) {
		var nq = [];
		var self = this;
		this.updateQueue.forEach(function(item, i, arr) {
			var res = self.get(item[0], item[1]).update(dt);
			if(res[0]) {
				nq.push(item);
			}
			else {
				var pl = players[item[2][0]];
				if(pl) {
					pl.workers++;
					pl.stone += 10;
				}
			}
			if(res[1]) {
				var chunkid = self.getChunkID(item[0], item[1]);
				self.emitChunk(chunkid.x, chunkid.y);
			}
		});
		this.updateQueue = nq;
	}
}

var Wrapper = {

}

var map = new GameMap();

function setup() {
	map.generateMap();
	setInterval(tick, 16);
	console.log("Server started successfully");
}

setup();

function tick() {
	var curTime = new Date().getTime();
	var dt = (curTime - lastTickTime) / 1000;
	lastTickTime = curTime;
	if(dt >= 0.5) {
		return;
	}
	var data = [];
	players.forEach(function (player, i, arr) {
		if(player == undefined) return;
		//Processing physics
		player.tickUpdate(dt);

		player.energy += dt * 2;
		//Data for transfer
		var iData = {};
		iData.id = player.id;
		iData.physics = player.physics;
		iData.name = player.network.nickname;
		iData.workers = player.workers;
		iData.energy = player.energy;
		iData.stone = player.stone;
		iData.iron = player.iron;
		data.push(iData);
	});
	map.update(dt);

	io.to('users').emit('update', data);
}
