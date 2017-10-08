const playerImage = 'assets/p1_stand.png';
const backgroundImage = 'assets/background.png';
const keycodes = [[87, 'w'], [65, 'a'], [83, 's'], [68, 'd']];
const gScale = 0.7;

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
		this.updated = false;
	}
}

var renderer;
var stage;
var objects;
var Resources;
var users = new Map();
var backgroundSprite;

var isGameActive = false;

var wKey = keyboard(keycodes[0][0], keycodes[0][1]);
var aKey = keyboard(keycodes[1][0], keycodes[1][1]);
var sKey = keyboard(keycodes[2][0], keycodes[2][1]);
var dKey = keyboard(keycodes[3][0], keycodes[3][1]);

var collcol = 0xFF0000;

var paint = new PIXI.Graphics();

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
	stage.addChild(paint);

	frame();
}

var platforms = [];

function frame() {
	requestAnimationFrame(frame);
	paint.clear();
	paint.beginFill(collcol);
	platforms.forEach(function(item, i, arr) {
		paint.drawRect(item[0].x * 0.7, item[0].y * 0.7, item[1].x * 0.7, item[1].y * 0.7);
	});
	paint.endFill();
	backgroundSprite.scale.set(Math.max(window.innerWidth / 1920, window.innerHeight / 1080), Math.max(window.innerWidth / 1920, window.innerHeight / 1080));
	renderer.resize(window.innerWidth, window.innerHeight);
	renderer.render(stage);
}

function setPlayerCoords(pl, coord) {
	pl.sprite.position.x = coord[0];
	pl.sprite.position.y = coord[1];
	pl.text.position.x = coord[0];
	pl.text.position.y = coord[1] - 50;
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