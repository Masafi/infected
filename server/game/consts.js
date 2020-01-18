const Vector = require('./vector.js')

const BlockPixelSize = new Vector(16, 16)
const BlockSize = new Vector(1, 1)
const ChunkSize = new Vector(8, 8)
const ChunkUnitSize = ChunkSize.mul(BlockSize)
const MapSize = new Vector(64, 16)
const MapBlockSize = MapSize.mul(ChunkSize)
const MapUnitSize = MapBlockSize.mul(BlockSize)

const RenderDistance = new Vector(5, 4) // in chunks

module.exports = {
	BlockPixelSize,
	BlockSize,
	ChunkSize,
	ChunkUnitSize,
	MapSize,
	MapBlockSize,
	MapUnitSize,
	RenderDistance,
}
