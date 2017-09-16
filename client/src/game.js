const playerImage = 'assets/p1_stand.png';
const backgroundImage = 'assets/background.png';
const keycodes = [87, 65, 83, 68];
const gScale = 0.7;

var isGameActive = false;

PIXI.loader
	.add(playerImage)
	.add(backgroundImage)
	.load(setup);

class Player {
	constructor() {
		this.sprite = new PIXI.Sprite(Resources[playerImage].texture);
		this.sprite.position.set(100, 200);
		this.id = 0;
		this.name = "";
		this.text = new PIXI.Text(name, {fontFamily: "Arial", fontSize: 32, fill: "Black"});
	}
}

var renderer;
var stage;
var objects;
var Resources;
var player;
var users = new Map();
var backgroundSprite;

var wKey = keyboard(keycodes[0]);
var aKey = keyboard(keycodes[1]);
var sKey = keyboard(keycodes[2]);
var dKey = keyboard(keycodes[3]);

function setup() {
	gameCanvas = document.getElementById('game');
	renderer = PIXI.autoDetectRenderer(500, 500, {view: gameCanvas, resolution: 1});
	renderer.autoResize = true;
	Resources = PIXI.loader.resources;

	player = new Player();
	backgroundSprite = new PIXI.Sprite(Resources[backgroundImage].texture);

	stage = new PIXI.Container();
	objects = new PIXI.Container();
	objects.addChild(player.sprite);
	objects.scale.set(gScale, gScale);
	stage.addChild(backgroundSprite);

	frame();
}

function activateGame() {
	isGameActive = 1;
	stage.addChild(objects);
}

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

function frame() {
	requestAnimationFrame(frame);
	if(isGameActive) {
		if(wKey.isDown) {
			let coords = [0, -1];
			movePlayer(player, coords);
		}
		if(aKey.isDown) {
			let coords = [-1, 0];
			movePlayer(player, coords);
		}
		if(sKey.isDown) {
			let coords = [0, 1];
			movePlayer(player, coords);
		}
		if(dKey.isDown) {
			let coords = [1, 0];
			movePlayer(player, coords);
		}
		socket.emit("coords", getPlayerCoords(player));
	}
	backgroundSprite.scale.set(Math.max(window.innerWidth / 1920, window.innerHeight / 1080), Math.max(window.innerWidth / 1920, window.innerHeight / 1080));
	renderer.resize(window.innerWidth, window.innerHeight);
	renderer.render(stage);
}

function movePlayer(pl, coord) {
	pl.sprite.position.x += 5 * coord[0];
	pl.sprite.position.y += 5 * coord[1];
}

function setPlayerCoords(pl, coord) {
	pl.sprite.position.x = coord[0];
	pl.sprite.position.y = coord[1];
	pl.text.position.x = coord[0];
	pl.text.position.y = coord[1] - 50;
}

function getPlayerCoords(pl) {
	return [pl.sprite.position.x, pl.sprite.position.y];
}

function keyboard(keyCode) {
	var key = {};
	key.code = keyCode;
	key.isDown = false;
	key.isUp = true;
	key.press = undefined;
	key.release = undefined;
	//The `downHandler`
	key.downHandler = function(event) {
		if (event.keyCode === key.code) {
			if (key.isUp && key.press) key.press();
			key.isDown = true;
			key.isUp = false;
		}
	};

	//The `upHandler`
	key.upHandler = function(event) {
		if (event.keyCode === key.code) {
			if (key.isDown && key.release) key.release();
			key.isDown = false;
			key.isUp = true;
		}
	};

	//Attach event listeners
	window.addEventListener("keydown", key.downHandler.bind(key), false);
	window.addEventListener("keyup", key.upHandler.bind(key), false);
	return key;
}