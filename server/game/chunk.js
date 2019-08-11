const Box = require('./box.js')
const { Air } = require('./blocks.js')

const { BlockSize, ChunkSize, ChunkUnitSize } = require('./consts.js')

class Chunk extends Box {
	constructor(rpos) {
		this.chunk = []
		this.pos = rpos.mul(ChunkUnitSize)
		this.rpos = rpos.copy()
		this.dim = BlockSize.mul(ChunkSize)

		for (let i = 0; i < ChunkSize.x; i++) {
			this.chunk.push([])
			for (let j = 0; j < ChunkSize.y; j++) {
				this.chunk[i].push(new Air(new Vector(i, j).add(this.rpos)))
			}
		}
	}

	getBlockAbsPos(i, j) {
		let v = (j == undefined ? i : new Vector(i, j))
		return this.pos.add(v.mul(BlockSize))
	}

	getBlockRelPos(i, j) {
		let v = (j == undefined ? i : new Vector(i, j))
		return v.div(BlockSize).sub(this.pos)
	}

	getData() {
		let data = []
		for (let i = 0; i < ChunkSize.x; i++) {
			data.push([])
			for (let j = 0; j < ChunkSize.y; j++) {
				data[i].push(this.chunk[i][j].getData())
			}
		}
		return data;
	}
}

module.exports = Chunk
