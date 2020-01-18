class TPlayer {
	constructor() {
		this.position = ScreenSize.copy()
		this.side = 0
		this.renderState = ""
		this.sprite = {}
		this.data = undefined
		Object.entries(HumanRenderStates).forEach((pair) => {
			if (!pair[1].animated) {
				this.sprite[pair[0]] = new Sprite(pair[1].texture)
			}
			else {
				this.sprite[pair[0]] = new AnimatedSprite(pair[1].texture)
			}
		})
	}

	get socket() {
		return getCurrentSocket()
	}

	checkChunk(i, j) {
		let pos = this.position.div(ChunkUnitSize).round()
		let chunkVector = new Vector(i, j)
		let dist = chunkVector.sub(pos).absv().sub(RenderDistance).maxv()
		return dist
	}

	showChunk(i, j) {
		let dist = this.checkChunk(i, j)
		if (dist <= 0) {
			GameMap.stageChunk(i, j, false)
		}
		else if (dist >= 2) {
			GameMap.stageChunk(i, j, true)
		}
	}

	updateVisibility() {
		for (let i = 0; i < MapSize.x; i++) {
			for (let j = 0; j < MapSize.y; j++) {
				this.showChunk(i, j)
			}
		}
	}

	preUpdate() {
		this.updateVisibility()
	}

	updateHuman() {
		if (this.renderState != this.data.renderState) {
			this.sprite[this.renderState].play(true)
			this.sprite[this.renderState].stageToScene(ObjectsScene, true)
			this.renderState = this.data.renderState
			this.sprite[this.renderState].play()
			this.sprite[this.renderState].stageToScene(ObjectsScene)
		}
		this.sprite[this.renderState].pos.copy(this.position)
		this.sprite[this.renderState].updatePos()
	}

	updateVirus() {

	}

	update() {
		this.preUpdate()
		if (this.side == 0) {
			this.updateHuman()
		}
		else {
			this.updateVirus()
		}
		this.data = undefined
	}
}
