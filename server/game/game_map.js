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

		//adding block class for every id
		let result = {}
		let classByName = {}
		for (const [key, value] of Object.entries(Blocks)) {
			classByName[key] = value
		}
		BlockInfo.info.forEach((block) => {
			block.BlockClass = classByName[block.blockClassName]
		})

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

	set(i, j, id) {
		let cx = Math.floor(i / ChunkSize.x)
		let cy = Math.floor(j / ChunkSize.y)
		this.map[cx][cy].chunk[i-cx*ChunkSize.x][j-cy*ChunkSize.y] = new (BlockInfo.get(id)).BlockClass(new Vector(cx, cy), id)
	}

	getChunk(i, j) {
		return this.map[i][j]
	}

	generateMap(seed) {
		const YOffset = 25
		const MaxHeight = 15

		seed = seed || Math.random() * 10

		var height = []
		for (let i = 0; i < MapBlockSize.x; i++) {
			height.push(Math.floor(PerlinNoise(i / 10, seed, seed) * MaxHeight + 1))
		}
		for (let i = 0; i < MapBlockSize.x; i++) {
			for(let j = 0; j < MaxHeight + 1; j++) {
				if(height[i] >= MaxHeight - j) {
					/*var curRand = Math.random() * 100
					if(curRand < 50) {
						var flower = Math.min(5, Math.floor(Math.random() * 6))
						this.get(i, j - 1 + YOffset).id = 4 + flower
					}
					else if(curRand < 60) {
						this.get(i, j - 1 + YOffset).id = 11
					}*/
					this.set(i, j + YOffset, 1)
					this.set(i, j + 1 + YOffset, 2)
					this.set(i, j + 2 + YOffset, 2)
					var curRand = Math.random() * 10
					if(curRand <= 5) {
						this.set(i, j + 3 + YOffset, 2)
						if(curRand <= 2) {
							this.set(i, j + 4 + YOffset, 2)
						}
					}
					break
				}
			}
			for(let j = 1; j < MaxHeight + 2 + YOffset; j++) {
				if(this.get(i, j - 1).id >= 1 && this.get(i, j).id == 0) {
					this.set(i, j, 3)
				}
			}
			for(let j = MaxHeight + 2 + YOffset; j < MapBlockSize.y; j++) {
				var curNoise = PerlinNoise(i / 10, j / 10, seed) * 100
				if(curNoise <= Math.max(60, 100 - j)) {
					this.set(i, j, 3)
				}
			}
		}
		/*var withoutTree = 0
		for(let i = 0; i < MapBlockSize.x; i++) {
			if(this.checkCoords(i - 1, 0) && this.checkCoords(i + 1, 0)) {
				for(let j = YOffset; j < MapBlockSize.y; j++) {
					if(this.get(i, j).id == 1) {
						if(this.get(i - 1, j).id == 1 && this.get(i + 1, j).id == 1) {
							if(Math.random() * 100 <= withoutTree) {
								this.get(i, j - 1).id = 10
								withoutTree = -2
							}
						}
						break
					}
				}
			}
			withoutTree++
			for(let j = MaxHeight + 1 + YOffset; j < MapBlockSize.y; j++) {
				var check = function(a, b) {
					return (SSelf.checkCoords(a, b) && SSelf.get(a, b).id == 0)
				}
				var count = check(i - 1, j) || check(i + 1, j) || check(i, j - 1) || check(i, j + 1)
				if(count && this.get(i, j).id != 0) {
					this.get(i, j).id = 2
				}
			}
		}
		this.map.forEach(function(row, i, arr) {
			row.forEach(function(item, j, rarr) {
				item.update(0)
			});
		});*/
	}

	update(i, j, dt) {
		this.get(i, j).update(dt)
	}
}

module.exports = new GameMap()
