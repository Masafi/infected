//Pixi initialization
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST
PIXI.loader
	.add(AtlasSpriteName)
	.add(HumanSpriteName)
	.add(BackgroundImage)
	.load(setup)

const Resources = PIXI.loader.resources

var Renderer

const ScreenScene = new PIXI.Container()
const GameScene = new PIXI.Container()
const ObjectsScene = new PIXI.Container()

const Camera = new Vector()
const ScreenSize = new Vector()
var Player
var GameMap
var BackgroundSprite
var GlobalScale = GlobalScaleFactor

// Stages of loading
var IsGameActive = false
var IsServerStarted = false
var IsPixiLoaded = false

function setup() {
	GameMap = new TGameMap()
	let gameCanvas = document.getElementById('game')
	Renderer = PIXI.autoDetectRenderer(500, 500, {view: gameCanvas, resolution: 1})
	Renderer.autoResize = true

	BackgroundSprite = new PIXI.Sprite(Resources[BackgroundImage].texture)
	ScreenScene.addChild(BackgroundSprite)
	ScreenSize.copy(window.innerWidth / GlobalScale / 2, window.innerHeight / GlobalScale / 2)

	GameScene.scale.set(GlobalScaleFactor, GlobalScaleFactor)
	GameScene.addChild(GameMap.mapScene)
	GameScene.addChild(ObjectsScene)

	loadAnimations()
	Player = new TPlayer()
	IsPixiLoaded = true

	enableGame()
	frame()
}

function preUpdate() {
	Player.position.copy(new Vector(Player.data.pos.x, Player.data.pos.y).mul(BlockSize))
	Camera.copy(Player.position.sub(ScreenSize).max(new Vector(0, 0)))
}

function scale() {
	// old
	// let bgscale = Math.max((.x * mapSize.x * gScale + (prop - 1) * window.innerWidth) / (bgSize.x * prop), (ChunkUnitSize.y * mapSize.y * gScale + (prop - 1) * window.innerHeight) / (bgSize.y * prop))
	
	// here goes magic
	// basically this const got from tests
	GlobalScale = GlobalScaleFactor * Math.max(window.innerWidth / 1536, window.innerHeight / 734)
	
	// MapUnitSize.mula(GlobalScale) - actual size of map in pixels (i think)
	// new Vector(window...) - resolution
	// .mula(BGConst - 1) something connected to parallax
	// .add(^) adding stuff?
	// .div(..) because it's scale factor
	// .maxv - both sizes must be equally scaled
	let bgScale = MapUnitSize.mula(GlobalScale).add(new Vector(window.innerWidth, window.innerHeight).mula(BGConst - 1)).div(BGSize.mula(BGConst)).maxv()
	BackgroundSprite.scale.set(bgScale, bgScale)
	ScreenSize.copy(window.innerWidth / GlobalScale / 2, window.innerHeight / GlobalScale / 2)
	// parallax
	BackgroundSprite.position.set(-Camera.x * GlobalScale / BGConst, -Camera.y * GlobalScale / BGConst)
	GameScene.scale.set(GlobalScale, GlobalScale)
	Renderer.resize(window.innerWidth, window.innerHeight/* - 1*/ /* fixed? */) // -1 because chrome sometimes lags
	Renderer.render(ScreenScene)
}

function frame() {
	requestAnimationFrame(frame)

	if (Player.data) {
		GameMap.render()
		preUpdate()
		Player.update()
	}

	scale();
}
