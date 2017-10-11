const atlas = 'assets/atlas.json';
const playerSprite = 'player.png';
const blockSpritePref = 'block';
const blockSpriteSuf = '.png';
const backgroundImage = 'assets/background.png';
const keycodes = [[87, 'w'], [65, 'a'], [83, 's'], [68, 'd']];
const gScale = 1;

PIXI.loader
	.add(atlas)
	.add(backgroundImage)
	.load(setup);

var renderer;
var screenStage;
var objects;
var Resources;
var backgroundSprite;
var mapScene;
var gameScene;

var isGameActive = false;
var myKeys = {};

var wKey = keyboard(keycodes[0][0], keycodes[0][1]);
var aKey = keyboard(keycodes[1][0], keycodes[1][1]);
var sKey = keyboard(keycodes[2][0], keycodes[2][1]);
var dKey = keyboard(keycodes[3][0], keycodes[3][1]);

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

var gameData = [];
var players = new Map();
var myNick = undefined;
var myId = undefined;
var camera = new Vector2(0, 0);
var map = undefined;
var CellSize = new Vector2(32, 32);
var lastTickTime = new Date().getTime();
var dataUpdated = false;
const eps = 1e-6;

class GraphicsPrimitive {
	constructor() {
		this.pos = new Vector2(0, 0);
		this.sprite = undefined;
	}

	initSprite(text) {
		this.sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(text));
	}

	updatePos(camera) {
		var screenPos = this.pos.sub(camera);
		this.sprite.position.x = Math.floor(screenPos.x);
		this.sprite.position.y = Math.floor(screenPos.y);
	}

	stageToScene(scene) {
		scene.addChild(this.sprite);
	}

	unstageFromScene(scene) {
		scene.removeChild(this.sprite);
	}
}

class PhysicPrimitive {
	constructor() {
		this._pos = new Vector2(0, 0);
		this.size = new Vector2(0, 0);
		this.vel = new Vector2(0, 0);
		this.acc = new Vector2(0, 0);
		this.mxvel = new Vector2(0, 0);
		this._rpos = new Vector2(0, 0);
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

	intersects(that) {
		return  (this.pos.x > that.pos.x && this.pos.x < that.pos.x + that.size.x ||
				this.pos.x + this.size.x > that.pos.x && this.pos.x + this.size.x < that.pos.x + that.size.x) &&
				(this.pos.y > that.pos.y && this.pos.y < that.pos.y + that.size.y ||
				this.pos.y + this.size.y > that.pos.y && this.pos.y + this.size.y < that.pos.y + that.size.y) ||
				(that.pos.x > this.pos.x && that.pos.x < this.pos.x + this.size.x ||
				that.pos.x + that.size.x > this.pos.x && that.pos.x + that.size.x < this.pos.x + this.size.x) &&
				(that.pos.y > this.pos.y && that.pos.y < this.pos.y + this.size.y ||
				that.pos.y + that.size.y > this.pos.y && that.pos.y + that.size.y < this.pos.y + this.size.y);
	}

	intersectsWithBorders(that) {
		return  (this.pos.x >= that.pos.x && this.pos.x <= that.pos.x + that.size.x ||
				this.pos.x + this.size.x >= that.pos.x && this.pos.x + this.size.x <= that.pos.x + that.size.x) &&
				(this.pos.y >= that.pos.y && this.pos.y <= that.pos.y + that.size.y ||
				this.pos.y + this.size.y >= that.pos.y && this.pos.y + this.size.y <= that.pos.y + that.size.y) ||
				(that.pos.x >= this.pos.x && that.pos.x <= this.pos.x + this.size.x ||
				that.pos.x + that.size.x >= this.pos.x && that.pos.x + that.size.x <= this.pos.x + this.size.x) &&
				(that.pos.y >= this.pos.y && that.pos.y <= this.pos.y + this.size.y ||
				that.pos.y + that.size.y >= this.pos.y && that.pos.y + that.size.y <= this.pos.y + this.size.y);
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
		this._pos = npos;
		this._rpos = npos.div(CellSize);
	}
	
	set rpos(npos) {
		this._pos = npos.mul(CellSize);
		this._rpos = npos;
	}

	get pos() {
		return this._pos;
	}

	get rpos() {
		return this._rpos;
	}
}

class Player {
	constructor(name) {
		this.physics = new PhysicPrimitive();
		this.physics.pos = new Vector2(200, -100);
		this.physics.size = new Vector2(31.5, 42);
		this.physics.mxvel = new Vector2(400, 4000);
		this.physics.acc = new Vector2(0, this.physics.g);

		this.graphics = new GraphicsPrimitive();
		this.graphics.initSprite(playerSprite);
		this.graphics.stageToScene(objects);
		this.nameSprite = new GraphicsPrimitive();
		this.nameSprite.sprite = new PIXI.Text(name, {fontFamily: "Arial", fontSize: 16, fill: "Black"});
		this.nameSprite.stageToScene(objects);
		this.name = name;
		this.updated = true;
	}

	update(data = undefined) {
		if(data) {
			if(Math.abs(data.physics._pos.x - this.physics.pos.x) > 0.5 || Math.abs(data.physics._pos.y - this.physics.pos.y) > 0.5) {
				this.physics.pos.x = data.physics._pos.x;
				this.physics.pos.y = data.physics._pos.y;
			}
			this.physics.vel.x = data.physics.vel.x;
			this.physics.vel.y = data.physics.vel.y;
			this.physics.acc.x = data.physics.acc.x;
			this.physics.acc.y = data.physics.acc.y;
			this.physics.mxvel.x = data.physics.mxvel.x;
			this.physics.mxvel.y = data.physics.mxvel.y;
			this.physics.size.x = data.physics.size.x;
			this.physics.size.y = data.physics.size.y;
			this.physics.g = data.physics.g;
			this.physics.standing = data.physics.standing;
		}
		this.graphics.pos = this.pos;
		this.graphics.updatePos(camera);
		this.nameSprite.pos = this.pos.add(new Vector2(0, -25));
		this.nameSprite.updatePos(camera);
	}

	processKeys(keys) {
		if (keys['a']) {
			this.physics.vel.x = -200;
		}
		else if (keys['d']) {
			this.physics.vel.x = 200;
		}
		else {
			this.physics.vel.x = 0;
		}

		if (keys['w'] && this.physics.standing) {
			this.physics.vel.y = -500;
		}
	}

	tickUpdate(dt) {
		//Pre update
		this.processKeys(myKeys);
		this.physics.vel = this.physics.updateSpeed(dt);
		this.physics.standing = false;
		
		//Collision
		var collisionObjects = [];
		map.forEach(function(row, i, arr) {
			row.forEach(function(item, j, rarr) {
				if(item.solid) {
					collisionObjects.push(item.physics);
				}
			});
		});
		this.physics.resolveCollision(collisionObjects, dt);
	}

	get pos() {
		return this.physics.pos;
	}

	set pos(npos) {
		this.physics.pos = npos;
	}
}

class Block {
	constructor() {
		this.physics = new PhysicPrimitive();
		this.physics.size = new Vector2(0, 0).add(CellSize);
		this._id = 0;
		this.graphics = new GraphicsPrimitive();
		this.graphics.initSprite(this.getTextureName());
		this.solid = false;
		this.id = 0;
	}

	getTextureName() {
		return blockSpritePref + (this.id >= 100 ? this.id : '0' + (this.id >= 10 ? this.id : '0' + this.id)) + blockSpriteSuf;
	}

	update(data = undefined) {
		if(data) {
			this.id = data.id;
			this.physics.pos.x = data.pos.x;
			this.physics.pos.y = data.pos.y;
		}
		this.graphics.pos = this.physics.pos;
		this.graphics.updatePos(camera);
	}

	set id(nid) {
		var oldid = this._id;
		this._id = nid;
		if(nid != oldid) {
			this.graphics.sprite.setTexture(PIXI.Texture.fromFrame(this.getTextureName()));
			if(nid >= 1 && oldid == 0) {
				this.solid = true;
				this.graphics.stageToScene(mapScene);
			}
			else {
				this.graphics.unstageFromScene(mapScene);
			}
		}
	}

	get id() {
		return this._id;
	}
}

function setup() {
	gameCanvas = document.getElementById('game');
	renderer = PIXI.autoDetectRenderer(500, 500, {view: gameCanvas, resolution: 1});
	renderer.autoResize = true;
	Resources = PIXI.loader.resources;

	screenStage = new PIXI.Container();
	gameScene = new PIXI.Container();
	mapScene = new PIXI.Container();
	objects = new PIXI.Container();
	backgroundSprite = new PIXI.Sprite(Resources[backgroundImage].texture);

	objects.scale.set(gScale, gScale);
	gameScene.addChild(objects);
	gameScene.addChild(mapScene);
	screenStage.addChild(backgroundSprite);
	
	frame();
}

function frame() {
	requestAnimationFrame(frame);
	if(players.has(myId)) {
		var curTime = new Date().getTime();
		var dt = (curTime - lastTickTime) / 1000;
		lastTickTime = curTime;
		players.get(myId).tickUpdate(dt);
	}
	if(!dataUpdated) {
		dataUpdated = true;
		gameData.forEach(function(item, i, arr) {
			if(item.id != myId) return;
			if(!players.has(item.id)) {
				var pl = new Player(item.name);
				players.set(item.id, pl);
			}
			players.get(item.id).update(item);
		});
		var curPlayer = players.get(myId);
		if(players.has(myId)) {
			camera = players.get(myId).pos.sub(new Vector2(window.innerWidth / gScale / 2, window.innerHeight / gScale / 2));
			players.get(myId).graphics.updatePos(camera);
			players.get(myId).nameSprite.updatePos(camera);
		}
		gameData.forEach(function(item, i, arr) {
			if(item.id == myId) return;
			if(!players.has(item.id)) {
				var pl = new Player(item.name);
				players.set(item.id, pl);
			}
			players.get(item.id).update(item);
		});
	}
	else {
		for(let i in players) {
			i[1].update();
		}
	}
	if(isGameActive && map) {
		map.forEach(function(row, i, maparr) {
			row.forEach(function(item, j, rowarr) {
				item.update();
			});
		});
	}
	backgroundSprite.scale.set(Math.max(window.innerWidth / 1920, window.innerHeight / 1080), Math.max(window.innerWidth / 1920, window.innerHeight / 1080));
	renderer.resize(window.innerWidth, window.innerHeight);
	renderer.render(screenStage);
}

function keyboard(keyCode, ch) {
	var key = {};
	key.code = keyCode;
	key.isDown = false;
	key.isUp = true;
	key.press = undefined;
	key.release = undefined;
	key.char = ch;
	//The `downHandler`
	key.downHandler = function(event) {
		if (event.keyCode === key.code) {
			if (key.isUp) {
				if(key.press) key.press();
				socket.emit("keyboard", ch, true, token);
				myKeys[keyCode] = true;
			}
			key.isDown = true;
			key.isUp = false;
		}
	};

	//The `upHandler`
	key.upHandler = function(event) {
		if (event.keyCode === key.code) {
			if (key.isDown) {
				if(key.release) key.release();
				socket.emit("keyboard", ch, false, token);
				myKeys[keyCode] = false;
			}
			key.isDown = false;
			key.isUp = true;
		}
	};

	//Attach event listeners
	window.addEventListener("keydown", key.downHandler.bind(key), false);
	window.addEventListener("keyup", key.upHandler.bind(key), false);
	return key;
}