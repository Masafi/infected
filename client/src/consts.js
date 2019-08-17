// File names
const AtlasSprite = 'assets/atlas.json';
const PlayerSprite = 'assets/player.json';
const BackgroundImage = 'assets/background.png';

// Player animation states
// Easy to write
const PlayerAnimData = [['player_run', 1, false],
				['player_run', 4, true],
				['player_jump_up', 2, false],
				['player_jump_down', 2, false],
				['player_hit', 3, false]]


function NumberPrefix(value) {
	return (value < 10 ? '0' : '') + value;
}

function createAnimation(loop = false, time = 0.2, frames = []) {
	return { frames, time, loop }
}

// Player animation data
// Easy to use
const PlayerAnimation = []
const BreakingAnimation = createAnimation();

// load animation
(() => {
	let getTexture = function(pref, id) {
		return PIXI.Texture.fromFrame(pref + "_" + NumberPrefix(id) + '.png')
	}
	PlayerAnimData.forEach(function(item, i, arr) {
		PlayerAnimation.push(createAnimation(item[2]))
		for (let j = 0; j < item[1]; j++) {
			//PlayerAnimation[i].frames.push(getTexture(item[0], j))
		}
	})

	for (let i = 0; i < 4; i++) {
		//BreakingAnimation.push(getTexture("breaking", i))
	}
})()



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
