const atlas = 'assets/atlas.json';
const playerSprite = 'player.png';
const platformSprite = 'platform.png';
const backgroundImage = 'assets/background.png';
const keycodes = [[87, 'w'], [65, 'a'], [83, 's'], [68, 'd']];
const gScale = 1;

PIXI.loader
	.add(atlas)
	.add(backgroundImage)
	.load(setup);

var renderer;
var stage;
var objects;
var Resources;
var backgroundSprite;

var isGameActive = false;

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

var gameData = [];
var players = new Map();
var myNick = undefined;
var myId = undefined;
var camera = new Vector2(0, 0);

class GraphicsPrimitive {
	constructor() {
		this.pos = new Vector2(0, 0);
		this.sprite = undefined;
	}

	updatePos(camera) {
		var screenPos = this.pos.sub(camera);
		this.sprite.position.x = screenPos.x;
		this.sprite.position.y = screenPos.y;
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
	constructor(name) {
		this.pos = new Vector2(0, 0);
		this.graphics = new GraphicsPrimitive();
		this.graphics.sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(playerSprite));
		this.graphics.stageToScene(objects);
		this.nameSprite = new GraphicsPrimitive();
		this.nameSprite.sprite = new PIXI.Text(name, {fontFamily: "Arial", fontSize: 16, fill: "Black"});
		this.nameSprite.stageToScene(objects);
		this.name = name;
		this.updated = true;
	}

	update(data) {
		this.pos.x = data.pos.x;
		this.pos.y = data.pos.y;
		this.graphics.pos = this.pos;
		this.graphics.updatePos(camera);
		this.nameSprite.pos = this.pos.add(new Vector2(0, -25));
		this.nameSprite.updatePos(camera);
	}
}

var platform = [];

function setup() {
	gameCanvas = document.getElementById('game');
	renderer = PIXI.autoDetectRenderer(500, 500, {view: gameCanvas, resolution: 1});
	renderer.autoResize = true;
	Resources = PIXI.loader.resources;

	stage = new PIXI.Container();
	backgroundSprite = new PIXI.Sprite(Resources[backgroundImage].texture);

	objects = new PIXI.Container();
	objects.scale.set(gScale, gScale);
	stage.addChild(backgroundSprite);

	var pl = new GraphicsPrimitive();
	pl.sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(platformSprite));
	pl.sprite.scale.set(1300 / 20, 100 / 10);
	pl.pos = new Vector2(-100, 700);
	pl.stageToScene(objects);
	platform.push(pl);
	pl = new GraphicsPrimitive();
	pl.sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(platformSprite));
	pl.sprite.scale.set(1300 / 20, 100 / 10);
	pl.pos = new Vector2(-100, -100);
	pl.stageToScene(objects);
	platform.push(pl);
	pl = new GraphicsPrimitive();
	pl.sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(platformSprite));
	pl.sprite.scale.set(100 / 20, 900 / 10);
	pl.pos = new Vector2(-100, -100);
	pl.stageToScene(objects);
	platform.push(pl);
	pl = new GraphicsPrimitive();
	pl.sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(platformSprite));
	pl.sprite.scale.set(100 / 20, 900 / 10);
	pl.pos = new Vector2(1200, -100);
	pl.stageToScene(objects);
	platform.push(pl);
	pl = new GraphicsPrimitive();
	pl.sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(platformSprite));
	pl.sprite.scale.set(100 / 20, 100 / 10);
	pl.pos = new Vector2(300, 400);
	pl.stageToScene(objects);
	platform.push(pl);
	pl = new GraphicsPrimitive();
	pl.sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(platformSprite));
	pl.sprite.scale.set(100 / 20, 20 / 10);
	pl.pos = new Vector2(600, 300);
	pl.stageToScene(objects);
	platform.push(pl);

	frame();
}

function frame() {
	requestAnimationFrame(frame);
	// for(let item in players) {
	// 	item.updated = false;
	// }
	gameData.forEach(function(item, i, arr) {
		if(item.id != myId) return;
		if(!players.has(item.id)) {
			var pl = new Player(item.name);
			players.set(item.id, pl);
		}
		players.get(item.id).update(item);
	});
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
	platform.forEach(function(item, i, arr) {
		item.updatePos(camera);
	});
	backgroundSprite.scale.set(Math.max(window.innerWidth / 1920, window.innerHeight / 1080), Math.max(window.innerWidth / 1920, window.innerHeight / 1080));
	renderer.resize(window.innerWidth, window.innerHeight);
	renderer.render(stage);
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