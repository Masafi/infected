class Block {
	constructor() {
		this.graphics = new Sprite('sprite_00.png')
		this.id = 0
	}

	update(data = undefined) {
		if (data) {
			this.graphics.pos = data.pos
			this.updateId(data)
			this.updateSprite(data)
		}
		this.graphics.updatePos(camera)
	}

	updateSprite(data) {
		this.graphics.updateTexture('sprite_' + (this.id < 10 ? '0' : '') + this.id + '.png')
	}

	updateId(data) {
		if (this.id == 0 && data.id != 0) {
			this.graphics.stageToScene(this.scene)
		}
		if (data.id == 0) {
			this.graphics.unstageFromScene(this.scene)
		}
		this.id = data.id
	}
}

class Chunk {
	constructor() {
		this.chunk = []
		for (let i = 0; i < ChunkSize.x; i++) {
			this.chunk.push([])
			for (let j = 0; j < ChunkSize.y; j++) {
				this.chunk[i].push(new Block());
			}
		}
	}
}

class GameMap {
	constructor() {
		this.mapScene = new PIXI.Container()
		this.chunkScenes = []
		this.chunks = []

		for (let i = 0; i < MapSize.x; i++) {
			ChunkScenes.push([])
			for (let j = 0; j < MapSize.y; j++) {
				ChunkScenes[i].push(new PIXI.Container())
				MapScene.addChild(ChunkScenes[i][j])
			}
		}
	}

	setChunk(data) {
		data.forEach((row) => {
			row.forEach((block) => {

			})
		})
	}
}