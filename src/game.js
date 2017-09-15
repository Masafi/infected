const playerImage = 'assets/p1_stand.png';
const keycodes = [87, 65, 83, 68];

PIXI.loader
	.add(playerImage)
	.load(setup);

class Player {
	constructor() {
		this.sprite = new PIXI.Sprite(Resources[playerImage].texture);
		this.sprite.position.set(100, 200);
	}
}

var renderer;
var stage;
var Resources;
var player;
var wKey = keyboard(keycodes[0]);
var aKey = keyboard(keycodes[1]);
var sKey = keyboard(keycodes[2]);
var dKey = keyboard(keycodes[3]);


function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function setup() {
	renderer = PIXI.autoDetectRenderer(100, 100);
	renderer.view.style.position = "absolute";
	renderer.view.style.display = "block";
	renderer.autoResize = true;
	renderer.resize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.view);
	Resources = PIXI.loader.resources;

	player = new Player();

	stage = new PIXI.Container();
	stage.addChild(player.sprite);

	frame();
}

function frame() {
	requestAnimationFrame(frame);
	if(wKey.isDown) {
		player.sprite.position.y -= 5;
	}
	if(aKey.isDown) {
		player.sprite.position.x -= 5;
	}
	if(sKey.isDown) {
		player.sprite.position.y += 5;
	}
	if(dKey.isDown) {
		player.sprite.position.x += 5;
	}
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