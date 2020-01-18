class Sprite {
	constructor(spriteName) {
		this.pos = new Vector()
		this.sprite = (spriteName ? new PIXI.Sprite(PIXI.Texture.fromFrame(spriteName)) : undefined)
	}

	updatePos() {
		let screenPos = this.pos.sub(Camera).round()
		this.sprite.position.x = screenPos.x
		this.sprite.position.y = screenPos.y
	}

	updateTexture(name) {
		this.sprite.texture = PIXI.Texture.fromFrame(name)
	}

	updateBlockTexture(id) {
		this.updateTexture('sprite_' + NumberPrefix(id) + '.png')
	}

	updateBlockMultiTexture(id, tid) {
		this.updateTexture('sprite_' + NumberPrefix(id) + '_' + NumberPrefix(tid) + '.png')
	}

	stageToScene(scene, unstage) {
		if (!unstage) scene.addChild(this.sprite)
		else scene.removeChild(this.sprite)
	}

	play(stop) {

	}
}

class AnimatedSprite extends Sprite {
	constructor(animation) {
		super()
		this.sprite = new PIXI.extras.AnimatedSprite(animation.frames)
		this.sprite.loop = animation.loop
		this.sprite.animationSpeed = animation.time
	}

	play(stop) {
		if (!stop) {
			this.sprite.gotoAndPlay(0)
			this.sprite.play()
		}
		else {
			this.sprite.stop()
		}
	}
}
