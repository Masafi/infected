//File names
const AtlasSprite = 'assets/atlas.json'
const PlayerSprite = 'assets/player.json'
const BackgroundImage = 'assets/background.png'

//Global scale
const GlobalScale = 1.7

//Player animation states
const PlayerAnimData = [['player_run', 1, false],
				['player_run', 4, true],
				['player_jump_up', 2, false],
				['player_jump_down', 2, false],
				['player_hit', 3, false]]

//Pixi initialization
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST
PIXI.loader
	.add(AtlasSprite)
	.add(PlayerSprite)
	.add(BackgroundImage)
	.load(setup)

const Resources = PIXI.loader.resources

var Renderer

const ScreenScene = new PIXI.Container()
const GameScene = new PIXI.Container()
const ObjectsScene = new PIXI.Container()

var IsGameStarted = false
var IsGameActive = false
var IsGameLoaded = false

const PlayerAnimation = []

function loadAnimation() {
	let getTextureName = function(pref, id) {
		return pref + "_" + (id >= 10 ? '' : '0') + id + '.png';
	};
	PlayerAnimData.forEach(function(item, i, arr)	 {
		PlayerAnimation.push([]);
		PlayerAnimation[i].push([]);
		for (let j = 0; j < item[1]; j++) {
				PlayerAnimation[i][0].push(PIXI.Texture.fromFrame(getTextureName(item[0], j)));
		}
		PlayerAnimation[i].push(item[2]);
	});
}

var map = new GameMap()

function setup() {
	let gameCanvas = document.getElementById('game')
	Renderer = PIXI.autoDetectRenderer(500, 500, {view: gameCanvas, resolution: 1})
	Renderer.autoResize = true

	loadAnimation()

	GameScene.scale.set(GlobalScale, GlobalScale)
	GameScene.addChild(map.mapScene)
	GameScene.addChild(ObjectsScene)

	let backgroundSprite = new PIXI.Sprite(Resources[backgroundImage].texture)
	ScreenScene.addChild(BackgroundSprite)

	IsGameLoaded = true

	enableGame()
}

function frame() {

}