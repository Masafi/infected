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

const Camera = new Vector()
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

	GameScene.scale.set(GlobalScaleFactor, GlobalScaleFactor)
	GameScene.addChild(GameMap.mapScene)
	GameScene.addChild(ObjectsScene)

	IsPixiLoaded = true

	enableGame()
	frame()
}

function frame() {
	requestAnimationFrame(frame)

	GameMap.render()
	if (Input.keys.wKey.isDown) {
		Camera.y -= 10
	}
	if (Input.keys.aKey.isDown) {
		Camera.x -= 10
	}
	if (Input.keys.sKey.isDown) {
		Camera.y += 10
	}
	if (Input.keys.dKey.isDown) {
		Camera.x += 10
	}

	// old
	// let bgscale = Math.max((.x * mapSize.x * gScale + (prop - 1) * window.innerWidth) / (bgSize.x * prop), (ChunkUnitSize.y * mapSize.y * gScale + (prop - 1) * window.innerHeight) / (bgSize.y * prop))
	
	// here goes magic
	// basically this const got from tests
	//GlobalScale = GlobalScaleFactor * Math.max(window.innerWidth / 1536, window.innerHeight / 734)
	
	// MapUnitSize.mula(GlobalScale) - actual size of map in pixels (i think)
	// new Vector(window...) - resolution
	// .mula(BGConst - 1) something connected to parallax
	// .add(^) adding stuff?
	// .div(..) because it's scale factor
	// .maxv - both sizes must be equally scaled
	let bgScale = MapUnitSize.mula(GlobalScale).add(new Vector(window.innerWidth, window.innerHeight).mula(BGConst - 1)).div(BGSize.mula(BGConst)).maxv()
	BackgroundSprite.scale.set(bgScale, bgScale)
	// parallax
	BackgroundSprite.position.set(-Camera.x * GlobalScale / BGConst, -Camera.y * GlobalScale / BGConst)
	GameScene.scale.set(GlobalScale, GlobalScale)
	Renderer.resize(window.innerWidth, window.innerHeight/* - 1*/ /* fixed? */) // -1 because chrome sometimes lags
	Renderer.render(ScreenScene)
}