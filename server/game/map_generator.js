const BlockBuilder = new (require('./block_builder.js'))
const { MapBlockSize } = require('./consts.js')
const PerlinNoise = require('./perlin_noise.js')
const BlockInfo = require('./block_info.js')
const GameMap = require('./game_map.js')

const YOffset = 25
const MaxHeight = 15

function minmax(from, value, to) {
	return Math.max(from, Math.min(to, value))
}

class MapGenerator {
	constructor(seed) {
		this.init(seed)
	}

	init(seed) {
		this.seed = seed || Math.random() * 10
		this.map = []
		for (let i = 0; i < MapBlockSize.x; i++) {
			this.map.push([])
			for (let j = 0; j < MapBlockSize.y; j++) {
				this.map[i].push({ id: 0 })
			}
		}
	}

	checkCoords(i, j) {
		return i != undefined && j != undefined && i >= 0 && j >= 0 && i < MapBlockSize.x && j < MapBlockSize.y
	}

	updateSeed() {
		this.seed = (1664525 * this.seed + 1013904223) % 1
	}

	set(i, j, cls, meta) {
		this.map[i][j].id = BlockInfo.getIdByName(cls)
		this.map[i][j].meta = meta
	}

	get(i, j) {
		if (!this.checkCoords(i, j)) return "Air"
		return BlockInfo.get(this.map[i][j].id).name
	}

	generateHeightMap() {
		this.heightMap = []
		for (let i = 0; i < MapBlockSize.x; i++) {
			let a = PerlinNoise(i / 20 + this.seed * 1000000, this.seed, this.seed) * MaxHeight
			let b = PerlinNoise(i / 10 + this.seed * 1000000, this.seed, this.seed) * MaxHeight / 2 - MaxHeight / 2
			let c = PerlinNoise(i / 5 + this.seed * 1000000, this.seed, this.seed) * MaxHeight / 4 - MaxHeight / 4
			this.heightMap.push(Math.floor(a+b+c) + 1)
		}
	}

	generateDirtMap() {
		this.updateSeed()
		this.dirtMap = []
		for (let i = 0; i < MapBlockSize.x; i++) {
			this.dirtMap.push(Math.floor(PerlinNoise(i / 8 + this.seed * 1000000, this.seed, this.seed) * MaxHeight) + 10)
		}
	}

	cave(i, j) {
		// let center = Math.exp(-((i-MapBlockSize.x/2)*(i-MapBlockSize.x/2)/200))*60
		// let correctedCenter = minmax(0, -0.01 * j + 1.3, 1) * center
		let value = Math.atan((j - 36) / 21) * 27 + 17 /* + correctedCenter */
		return minmax(0, value, 100)
	}

	setCave(i, j, cls, meta) {
		let curNoise = PerlinNoise(i / 10 + this.seed * 1000000, j / 10, this.seed) * 100
		if (curNoise >= this.cave(i, j)) {
			this.set(i, j, cls, meta)
		}
	}

	generateTerrain() {
		this.updateSeed()
		for (let i = 0; i < MapBlockSize.x; i++) {
			let j = this.heightMap[i] + YOffset

			this.setCave(i, j, "Grass")
			j++

			for (; j < YOffset + this.heightMap[i] + this.dirtMap[i]; j++) {
				this.setCave(i, j, "Dirt")
			}

			for (; j < MapBlockSize.y; j++) {
				this.setCave(i, j, "Stone")
			}
		}
	}

	generateCaveOutline() {
		let checker = (i, j) => {
			return this.get(i, j) == "Air"
		}
		for (let i = 0; i < MapBlockSize.x; i++) {
			for (let j = 0; j < MapBlockSize.y; j++) {
				if (this.get(i, j) == "Stone") {
					if (checker(i - 1, j)
					 || checker(i, j + 1)
					 || checker(i + 1, j)
					 || checker(i, j - 1)) {
						this.set(i, j, "Dirt")
					}
				}
			}
		}
	}

	generateMap() {
		for (let i = 0; i < MapBlockSize.x; i++) {
			for (let j = 0; j < MapBlockSize.y; j++) {
				BlockBuilder.set(i, j, this.map[i][j].id, this.map[i][j].meta)
			}
		}
	}

	generateMultiTexture() {
		for (let i = 0; i < MapBlockSize.x; i++) {
			for (let j = 0; j < MapBlockSize.y; j++) {
				GameMap.get(i, j).updateMultiTexture()
			}
		}
	}

	generate() {
		this.generateHeightMap()
		this.generateDirtMap()
		this.generateTerrain()
		this.generateCaveOutline()
		
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
		this.generateMap()
		this.generateMultiTexture()
	}
}

module.exports = MapGenerator