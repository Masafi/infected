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

	stage = new PIXI.Container();
	backgroundSprite = new PIXI.Sprite(Resources[backgroundImage].texture);

	objects = new PIXI.Container();
	objects.scale.set(gScale, gScale);
	stage.addChild(backgroundSprite);

	frame();
}

function activateGame() {
	isGameActive = 1;
	stage.addChild(objects);
}

function frame() {
	requestAnimationFrame(frame);
	if(isGameActive) {
		if(wKey.isDown) {
			socket.emit("keyboard", 0);
		}
		if(aKey.isDown) {
			socket.emit("keyboard", 1);
		}
		if(sKey.isDown) {
			socket.emit("keyboard", 2);
		}
		if(dKey.isDown) {
			socket.emit("keyboard", 3);
		}
	}
	backgroundSprite.scale.set(Math.max(window.innerWidth / 1920, window.innerHeight / 1080), Math.max(window.innerWidth / 1920, window.innerHeight / 1080));
	renderer.resize(window.innerWidth, window.innerHeight);
	renderer.render(stage);
}

function setPlayerCoords(pl, coord) {
	pl.sprite.position.x = coord[0];
	pl.sprite.position.y = coord[1];
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