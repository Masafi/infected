// File names
const AtlasSpriteName = 'assets/atlas.json';
const HumanSpriteName = 'assets/player.json';
const BackgroundImage = 'assets/background.png';

// Human animation states
// Easy to write
const HumanAnimData = [['player_run', 4, true],
				['player_jump_up', 2, false],
				['player_jump_down', 2, false],
				['player_hit', 3, false]]


function NumberPrefix(value) {
	return (value < 10 ? '0' : '') + value;
}

function getTexture(pref, id) {
	return PIXI.Texture.fromFrame(pref + "_" + NumberPrefix(id) + '.png')
}

function createAnimation(name, size, loop = false, time = 0.2) {
	let frames = []
	for (let j = 0; j < size; j++) {
		frames.push(getTexture(name, j))
	}
	return { animated: true, texture: {frames, time, loop} }
}

var BreakingAnimation;
const HumanRenderStates = {
	'': {animated: false, texture: undefined },
	'player_stand': {animated: false, texture: "player_run_00.png" },
}

function loadAnimations() {
	BreakingAnimation = createAnimation("breaking", 4)

	HumanAnimData.forEach(function(item, i, arr) {
		HumanRenderStates[item[0]] = createAnimation(item[0], item[1], item[2])
	})
}

// Game consts
const BlockSize = new Vector(16, 16)
const ChunkSize = new Vector(8, 8)
const ChunkUnitSize = ChunkSize.mul(BlockSize)
const MapSize = new Vector(64, 16)
const MapBlockSize = MapSize.mul(ChunkSize)
const MapUnitSize = MapBlockSize.mul(BlockSize)
const BGConst = 25 // scale const something background 
const BGSize = new Vector(1152, 576) // image in pixels
const GlobalScaleFactor = 1.7 // don't ask
const RenderDistance = new Vector(5, 4) // in chunks
