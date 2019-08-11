class Sprite {
	constructor(spriteName) {
		this.pos = new Vector()
		this.sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(spriteName))
	}

	updatePos(camera) {
		var screenPos = this.pos.sub(camera)
		this.sprite.position.x = Math.floor(screenPos.x)
		this.sprite.position.y = Math.floor(screenPos.y)
	}

	updateTexture(name) {
		this.sprite.texture = PIXI.Texture.fromFrame(name)
	}

	stageToScene(scene) {
		scene.addChild(this.sprite)
	}

	unstageFromScene(scene) {
		scene.removeChild(this.sprite)
	}

	updateAnimation(info, time = 0.2) {
		this.sprite = new PIXI.extras.AnimatedSprite(info[0])
		this.sprite.loop = info[1]
		this.sprite.play()
		this.sprite.animationSpeed = time
	}
}