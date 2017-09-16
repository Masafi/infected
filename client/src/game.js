const playerImage = 'assets/p1_stand.png';
const backgroundImage = 'assets/background.png';
const keycodes = [87, 65, 83, 68];
const gScale = 0.7;

PIXI.loader
	.add(playerImage)
	.add(backgroundImage)
	.load(setup);

class Player {
	constructor() {
		this.sprite = new PIXI.Sprite(Resources[playerImage].texture);
		this.sprite.position.set(100, 200);
	}
}

var renderer;
var stage;
var objects;
var Resources;
var player;
var backgroundSprite;
var wKey = keyboard(keycodes[0]);
var aKey = keyboard(keycodes[1]);
var sKey = keyboard(keycodes[2]);
var dKey = keyboard(keycodes[3]);

function setup() {
	renderer = PIXI.autoDetectRenderer(500, 500);
	renderer.view.style.position = "absolute";
	renderer.view.style.display = "block";
	renderer.autoResize = true;
	document.body.appendChild(renderer.view);
	Resources = PIXI.loader.resources;

	player = new Player();
	backgroundSprite = new PIXI.Sprite(Resources[backgroundImage].texture);

	stage = new PIXI.Container();
	objects = new PIXI.Container();
	objects.addChild(player.sprite);
	objects.scale.set(gScale, gScale);
	stage.addChild(backgroundSprite);
	stage.addChild(objects);

	frame();
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
	/*if(wKey.isDown) {
		socket.emit("move", myid, 0, -1);
	}
	if(aKey.isDown) {
		socket.emit("move", myid, -1, 0);
	}
	if(sKey.isDown) {
		socket.emit("move", myid, 0,  1);
	}
	if(dKey.isDown) {
		socket.emit("move", myid, 1,  0);
	}*/
	backgroundSprite.scale.set(Math.max(window.innerWidth / 1920, window.innerHeight / 1080), Math.max(window.innerWidth / 1920, window.innerHeight / 1080));
	renderer.resize(window.innerWidth, window.innerHeight);
	renderer.render(stage);
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
		event.preventDefault();
	};

	//The `upHandler`
	key.upHandler = function(event) {
		if (event.keyCode === key.code) {
			if (key.isDown && key.release) key.release();
			key.isDown = false;
			key.isUp = true;
		}
		event.preventDefault();
	};

	//Attach event listeners
	window.addEventListener(
		"keydown", key.downHandler.bind(key), false
	);
	window.addEventListener(
		"keyup", key.upHandler.bind(key), false
	);
	return key;
}