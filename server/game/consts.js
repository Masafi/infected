const Vector = require('./vector.js')

const BlockSize = new Vector(1, 1)
const ChunkSize = new Vector(8, 8)
const ChunkUnitSize = ChunkSize.mul(BlockSize)
const MapSize = new Vector(64, 16)
const MapBlockSize = MapSize.mul(ChunkSize)
const MapUnitSize = MapBlockSize.mul(BlockSize)

module.exports = {
	BlockSize,
	ChunkSize,
	ChunkUnitSize,
	MapSize,
	MapBlockSize,
	MapUnitSize,
}
