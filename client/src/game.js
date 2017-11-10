const textureCSV = 'assets/texture.csv';
const atlasSprite = 'assets/atlas.json';
const playerSprite = 'assets/player.json';
const backgroundImage = 'assets/background.png';
const keycodes = [[87, 'w'], [65, 'a'], [83, 's'], [68, 'd']];	
var gScale = 2;
var playerAnim = [['player_run', 1, false], ['player_run', 4, true], ['player_jump_up', 2, false], ['player_jump_down', 2, false]];

PIXI.loader
	.add(atlasSprite)
	.add(playerSprite)
	.add(backgroundImage)
	.load(setup);

var renderer;
var screenStage;
var objects;
var Resources;
var backgroundSprite;
var mapScene;
var gameScene;
var chunkScenes = [];

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
var CellSize = new Vector2(16, 16);
var lastTickTime = new Date().getTime();
var dataUpdated = false;
const eps = 1e-6;
const chunkSize = 8;
var mapSize = new Vector2(512, 128);
var renderDistance = 30;
var playerAnimations = [];
var selectBorder = undefined;

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

	updateAnimation(info, time = 0.2) {
		this.sprite = new PIXI.extras.AnimatedSprite(info[0]);
		this.sprite.loop = info[1];
		this.sprite.play();
		this.sprite.animationSpeed = time;
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
		this.rscale = CellSize.mula(1);
		this.standing = false;
		this.g = 1000;
	}

	set pos(npos) {
		this._pos = npos;
		this._rpos = npos.div(this.rscale);
	}
	
	set rpos(npos) {
		this._pos = npos.mul(this.rscale);
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
		this.physics.size = new Vector2(15, 21);
		this.physics.mxvel = new Vector2(400, 4000);
		this.physics.acc = new Vector2(0, this.physics.g);
		this.direction = 0;

		this.graphics = [];
		var self = this;
		playerAnimations.forEach(function(item, i, arr) {
			self.graphics.push(new GraphicsPrimitive());
			self.graphics[i].updateAnimation(playerAnimations[i]);
			self.graphics[i].stageToScene(objects);
			self.graphics[i].sprite.pivot.x = 9;
			if(i > 0) {
				self.graphics[i].sprite.visible = false;
			}
		});
		this.currentAnim = 0;
		this.updateAnimation(0);
		this.nameSprite = new GraphicsPrimitive();
		this.nameSprite.sprite = new PIXI.Text(name, {fontFamily: "Arial", fontSize: 16, fill: "Black"});
		this.nameSprite.stageToScene(objects);
		this.name = name;
		this.updated = true;
		this.workers = 3;
		this.energy = 100;
		this.stone = 100;
		this.iron = 100;
	}

	updateAnimation(id) {
		this.graphics[this.currentAnim].sprite.visible = false;
		this.currentAnim = id;
		this.graphics[this.currentAnim].sprite.visible = true;
		this.graphics[this.currentAnim].sprite.play();
	}

	update(data = undefined) {
		if(data) {
			if(Math.abs(data.physics._pos.x - this.physics.pos.x) > 0.1 || Math.abs(data.physics._pos.y - this.physics.pos.y) > 0.1) {
				var npos = new Vector2(data.physics._pos.x, data.physics._pos.y);
				this.physics.pos = npos;
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
			this.workers = data.workers;
			this.energy = data.energy;
			this.stone = data.stone;
			this.iron = data.iron;
		}
		if(this.physics.vel.y > 0) {
			if(this.currentAnim != 2) {
				this.updateAnimation(2);
			}
		}
		else if(this.physics.vel.y < 0) {
			if(this.currentAnim != 3) {
				this.updateAnimation(3);
			}
		}
		else if(this.physics.vel.x != 0) {
			if(this.currentAnim != 1) {
				this.updateAnimation(1);
			}
		}
		else {
			this.updateAnimation(0);
		}
		var self = this;
		this.graphics.forEach(function(item, i, arr) {
			if(self.physics.vel.x > 0) {
				self.direction = 0;
				item.sprite.scale.x = 1;
			}
			else if(self.physics.vel.x < 0) {
				self.direction = 1;
				item.sprite.scale.x = -1;
			}
			item.pos = self.pos.add(new Vector2(8, -1));
			item.updatePos(camera);
		});
		this.nameSprite.pos = this.pos.add(new Vector2(0, -25));
		this.nameSprite.updatePos(camera);
	}

	get pos() {
		return this.physics.pos;
	}

	set pos(npos) {
		this.physics.pos = npos;
	}
}

class Block {
	constructor(scene) {
		this.physics = new PhysicPrimitive();
		this.physics.size = new Vector2(0, 0).add(CellSize);
		this._id = 0;
		this.scene = scene;
		this.graphics = new GraphicsPrimitive();
		this.graphics.initSprite('sprite_00.png');
		this.solid = false;
		this.id = 0;

		this.breakable = false;
		this.isBreaking = false;
		this.breakTime = 0;
		this.breakTimer = 0;
		this.breakingAnim = undefined;
	}

	update(data = undefined) {
		if(data) {
			this.id = data._id;
			this.physics.pos.x = data.physics._pos.x;
			this.physics.pos.y = data.physics._pos.y;
			if(this.id == 14) {
				this.physics.pos = this.physics.pos.sub(new Vector2(129 / 2 - 1.5 * CellSize.x, 211 - CellSize.y));
			}
		}
		this.graphics.pos = this.physics.pos;
		this.graphics.updatePos(camera);
		if(this.breakingAnim) {
			this.breakingAnim.updatePos(camera);
		}
	}

	breakMe() {
		if(this.breakable && !this.isBreaking) 	{
			this.isBreaking = true;
			this.breakTimer = 0;
			this.breakingAnim = new GraphicsPrimitive();
			var frames = [];
			for(let i = 0; i < 4; i++) {
				frames.push(PIXI.Texture.fromFrame("breaking_0" + i + ".png"));
			}
			if(this.breakTime) {
				this.breakingAnim.updateAnimation([frames, false], 0.05 / this.breakTime);
				this.breakingAnim.pos = this.physics.pos;
				this.breakingAnim.updatePos(camera);
				this.breakingAnim.stageToScene(mapScene);
			}
		}
	}

	set id(nid) {
		var oldid = this._id;
		this._id = nid;
		if(nid != oldid) {
			if(this.breakingAnim) {
				this.breakingAnim.unstageFromScene(mapScene);
				this.breakingAnim = undefined;
			}
			this.graphics.sprite.texture = PIXI.Texture.fromFrame('sprite_' + (this._id < 10 ? '0' : '') + this._id + '.png');
			if(this._id >= 1 && this._id <= 4 || this._id >= 12 && this._id <= 13) {
				this.breakTime = (this._id % 2 ? 2 : 4);
				this.breakable = true;
			}
			else {
				this.breakTime = 0;
				this.breakable = false;
			}
			if(this._id != 0 && oldid == 0) {
				this.graphics.stageToScene(this.scene);
			}
			if(this._id == 0) {
				this.graphics.unstageFromScene(this.scene);
			}
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
		this.prevUpdate = false;
		for(let i = 0; i < chunkSize; i++) {
			this.chunk.push([]);
			for(let j = 0; j < chunkSize; j++) {
				this.chunk[i].push(new Block(chunkScenes[rpos.x][rpos.y]));
				this.chunk[i][j].physics.rpos = new Vector2(i, j).add(this.physics.pos);
			}
		}
		this.delivered = false;
	}

	update(data) {
		var self = this;
		var curUpdate = this.updateRender();
		if(curUpdate || this.prevUpdate || data) {
			this.delivered = true;
			this.prevUpdate = curUpdate;
			this.chunk.forEach(function(row, i, arr) {
				row.forEach(function(item, j, rarr) {
					if(data) {
						item.update(data.chunk[i][j]);
					}
					else {
						item.update();
					}
				})
			});
		}
	}

	updateRender() {
		if(players.has(myId)) {
			var dist = Math.max(Math.min(Math.abs(this.physics.pos.x - (camera.x + window.innerWidth / gScale / 2) / CellSize.x), 
										 Math.abs(this.physics.pos.x + chunkSize - (camera.x + window.innerWidth / gScale / 2) / CellSize.x)), 
								Math.min(Math.abs(this.physics.pos.y - (camera.y + window.innerHeight / gScale / 2) / CellSize.y), 
										 Math.abs(this.physics.pos.y + chunkSize - (camera.y + window.innerHeight / gScale / 2) / CellSize.y))); 
			if(dist <= renderDistance) {
				if(!this.delivered) {
					socket.emit('requestChunk', this.physics.rpos.x, this.physics.rpos.y);
				}
				chunkScenes[this.physics.rpos.x][this.physics.rpos.y].visible = true;
				return true;
			}
			else {
				this.delivered = false;
				chunkScenes[this.physics.rpos.x][this.physics.rpos.y].visible = false;
				return false;
			}
		}
	}

	get(i, j) {
		return this.chunk[i - this.physics.pos.x][j - this.physics.pos.y];
	}
	set(i, j, val) {
		this.chunk[i - this.physics.pos.x][j - this.physics.pos.y] = val;
	}
}

class GameMap {
	constructor() {
		this.map = [];
		for(let i = 0; i < mapSize.x / chunkSize; i++) {
			this.map.push([]);
			for(let j = 0; j < mapSize.y / chunkSize; j++) {
				this.map[i].push(new Chunk(new Vector2(i, j)));
			}
		}
		this.updateQueue = [];
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
	
	updateChunk(chunk) {
		this.getChunk(chunk.physics._pos.x, chunk.physics._pos.y).update(chunk);
	}

	updateBlock(i, j) {
		this.updateQueue.push([i, j]);
	}

	checkCoords(i, j) {
		return i >= 0 && j >= 0 && i < mapSize.x && j < mapSize.y;
	}

	update() {
		this.map.forEach(function(row, i, arr) {
			row.forEach(function(item, j, rarr) {
				item.update(undefined);
			});
		});
	}
}

var map = undefined;

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
	selectBorder = new GraphicsPrimitive();
	selectBorder.initSprite('selectBorder.png');
	selectBorder.screenPos = new Vector2(-100, -100);
	selectBorder.updateScreenPos = function() {
		selectBorder.pos = selectBorder.screenPos.div(new Vector2(gScale, gScale)).add(camera);
		var rpos = new Vector2();
		rpos.x = Math.floor(selectBorder.pos.x / CellSize.x);
		rpos.y = Math.floor(selectBorder.pos.y / CellSize.y);
		selectBorder.pos = rpos.mul(CellSize);
		selectBorder.updatePos(camera);
		if(map.checkCoords(rpos.x, rpos.y) && map.get(rpos.x, rpos.y).id != 0) {
			selectBorder.sprite.visible = true;
		}
		else {
			selectBorder.sprite.visible = false;
		}
	};

	loadAnimation();
	gameScene.scale.set(gScale, gScale);
	gameScene.addChild(mapScene);
	gameScene.addChild(objects);
	screenStage.addChild(backgroundSprite);
	for(let i = 0; i < mapSize.x / chunkSize; i++) {
		chunkScenes.push([]);
		for(let j = 0; j < mapSize.y / chunkSize; j++) {
			chunkScenes[i].push(new PIXI.Container());
			mapScene.addChild(chunkScenes[i][j]);
		}
	}

	map = new GameMap();
	
	selectBorder.stageToScene(gameScene);
	frame();
}

function loadAnimation() {
	var getTextureName = function(pref, id) {
		return pref + "_" + (id >= 10 ? '' : '0') + id + ".png";
	};
	playerAnim.forEach(function(item, i, arr)	 {
		playerAnimations.push([]);
		playerAnimations[i].push([]);
		for (var j = 0; j < item[1]; j++) {
				playerAnimations[i][0].push(PIXI.Texture.fromFrame(getTextureName(item[0], j)));
		}
		playerAnimations[i].push(item[2]);
	});
}

var fps = 0;
var fpstime = 0;

function frame() {
	requestAnimationFrame(frame);
	if(players.has(myId)) {
		var curTime = new Date().getTime();
		var dt = (curTime - lastTickTime) / 1000;
		lastTickTime = curTime;
		fpstime += dt;
		fps++;
		if(fpstime >= 1) {
			fps = 0;
			fpstime = 0;
		}
		//players.get(myId).tickUpdate(dt);
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
			camera.x = Math.max(Math.min(camera.x, mapSize.x * CellSize.x - window.innerWidth / gScale), 0);
			camera.y = Math.max(Math.min(camera.y, mapSize.y * CellSize.y - window.innerHeight / gScale), 0);
			players.get(myId).graphics.forEach(function(item, i, arr) {
				item.updatePos(camera);
			});
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
		map.update();
	}
	if(isGameActive && players.has(myId)) {	
		var pl = players.get(myId);
		document.getElementById('workersVal').innerHTML = '' + Math.floor(pl.workers);
		document.getElementById('energyVal').innerHTML = '' + Math.floor(pl.energy);
		document.getElementById('stoneVal').innerHTML = '' + Math.floor(pl.stone);
		document.getElementById('ironVal').innerHTML = '' + Math.floor(pl.iron);
	}
	if(selectBorder.screenPos){ 
		selectBorder.updateScreenPos();
	}
	backgroundSprite.scale.set(Math.max(window.innerWidth / 1920, window.innerHeight / 1080), Math.max(window.innerWidth / 1920, window.innerHeight / 1080));
	renderer.resize(window.innerWidth, window.innerHeight - 1);
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

function mouseDown(event, canvas) {
	if(isGameActive) {
		var pos = new Vector2();
		pos.x = event.pageX - canvas.offsetLeft;
		pos.y = event.pageY - canvas.offsetTop;
		socket.emit("mouse", pos.div(new Vector2(gScale, gScale)).add(camera), event.button, token);
	}
}

function mouseMoved(event, canvas) {
	if(isGameActive) {
		var pos = new Vector2();
		pos.x = event.pageX - canvas.offsetLeft;
		pos.y = event.pageY - canvas.offsetTop;
		selectBorder.screenPos = pos;
	}
}