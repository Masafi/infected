// File names
const AtlasSprite = 'assets/atlas.json';
const PlayerSprite = 'assets/player.json';
const BackgroundImage = 'assets/background.png';

// Player animation states
const PlayerAnimData = [['player_run', 1, false],
				['player_run', 4, true],
				['player_jump_up', 2, false],
				['player_jump_down', 2, false],
				['player_hit', 3, false]]

const PlayerAnimation = []

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