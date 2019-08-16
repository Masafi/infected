class Block {
	constructor(pos) {
		this.sprite = new Sprite('sprite_00.png')
		this.sprite.pos = pos
		this.id = 0
	}

	render() {
		this.sprite.updatePos()
	}

	update(data = undefined) {
		this.updateId(data)
		this.updateSprite(data)
	}

	updateSprite(data) {
		this.sprite.updateTexture('sprite_' + (this.id < 10 ? '0' : '') + (this.id == 0 || this.id >= 3 ? this.id : (this.id + '_00')) + '.png')
	}

	updateId(data) {
		if (this.id == 0 && data.id != 0) {
			//this.sprite.stageToScene(this.scene)
		}
		if (data.id == 0) {
			//this.sprite.stageToScene(this.scene, true)
		}
		this.id = data.id
	}
}

class Chunk {
	constructor(rpos) {
		this.isRendered = false
		this.chunkScene = new PIXI.Container()
		this.chunk = []
		for (let i = 0; i < ChunkSize.x; i++) {
			this.chunk.push([])
			for (let j = 0; j < ChunkSize.y; j++) {
				this.chunk[i].push(new Block(new Vector(i, j).mul(BlockSize).add(rpos.mul(ChunkUnitSize))));
				this.chunk[i][j].sprite.stageToScene(this.chunkScene)
			}
		}
	}

	apply(f) {
		for (let i = 0; i < ChunkSize.x; i++) {
			for (let j = 0; j < ChunkSize.y; j++) {
				f(this.chunk[i][j], i, j)
			}
		}
	}

	stageToScene(scene, unstage) {
		this.isRendered = !unstage
		if (!unstage) scene.addChild(this.chunkScene)
		else scene.removeChild(this.chunkScene)
	}

	update(data) {
		this.apply((block, i, j) => {
			block.update(data[i][j])
		})
	}

	render() {
		if (this.isRendered) {
			this.apply((block) => {
				block.render()
			})
		}
	}
}

class TGameMap {
	constructor() {
		this.mapScene = new PIXI.Container()
		this.chunks = []

		for (let i = 0; i < MapSize.x; i++) {
			this.chunks.push([])
			for (let j = 0; j < MapSize.y; j++) {
				this.chunks[i].push(new Chunk(new Vector(i, j)))

				// TODO: remove (debug)
				this.stageChunk(i, j)
			}
		}
	}

	stageChunk(i, j, unstage) {
		this.chunks[i][j].stageToScene(this.mapScene, unstage)
	}

	update(info) {
		this.chunks[info.i][info.j].update(info.chunk)
	}

	render() {
		for (let i = 0; i < MapSize.x; i++) {
			for (let j = 0; j < MapSize.y; j++) {
				this.chunks[i][j].render()
			}
		}
	}
}