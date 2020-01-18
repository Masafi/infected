const Vector = require('./vector.js')
const Blocks = require('./blocks.js')
const Chunk = require('./chunk.js')
const PerlinNoise = require('./perlin_noise.js')
const BlockInfo = require('./block_info.js')

const { ChunkSize, ChunkUnitSize, MapSize, MapBlockSize } = require('./consts.js')

class GameMap {
	constructor() {
		//Static field
		Blocks.Block.GameMap = this

		//map init
		this.map = []
		for (let i = 0; i < MapSize.x; i++) {
			this.map.push([])
			for (let j = 0; j < MapSize.y; j++) {
				this.map[i].push(new Chunk(new Vector(i, j)))
			}
		}
	}

	get(i, j) {
		let cx = Math.floor(i / ChunkSize.x)
		let cy = Math.floor(j / ChunkSize.y)
		return this.map[cx][cy].chunk[i-cx*ChunkSize.x][j-cy*ChunkSize.y]
	}

	set(i, j, obj) {
		let cx = Math.floor(i / ChunkSize.x)
		let cy = Math.floor(j / ChunkSize.y)
		this.map[cx][cy].lastUpdated = Date.now()
		this.map[cx][cy].chunk[i-cx*ChunkSize.x][j-cy*ChunkSize.y] = obj
	}

	getChunk(i, j) {
		return this.map[i][j]
	}

	checkCoords(i, j) {
		return i != undefined && j != undefined && i >= 0 && j >= 0 && i < MapBlockSize.x && j < MapBlockSize.y
	}
}

module.exports = new GameMap()
