class Sprite {
	constructor(spriteName) {
		this.pos = new Vector()
		this.sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(spriteName))
	}

	updatePos() {
		var screenPos = this.pos.sub(Camera)
		this.sprite.position.x = Math.floor(screenPos.x)
		this.sprite.position.y = Math.floor(screenPos.y)
	}

	updateTexture(name) {
		this.sprite.texture = PIXI.Texture.fromFrame(name)
	}

	stageToScene(scene, unstage) {
		if (!unstage) scene.addChild(this.sprite)
		else scene.removeChild(this.sprite)
	}

	updateAnimation(info, time = 0.2) {
		this.sprite = new PIXI.extras.AnimatedSprite(info[0])
		this.sprite.loop = info[1]
		this.sprite.play()
		this.sprite.animationSpeed = time
	}
}

// TODO: animated sprite

function loadAnimation() {
	let getTextureName = function(pref, id) {
		return pref + "_" + (id >= 10 ? '' : '0') + id + '.png';
	};
	PlayerAnimData.forEach(function(item, i, arr)	 {
		PlayerAnimation.push([]);
		PlayerAnimation[i].push([]);
		for (let j = 0; j < item[1]; j++) {
				PlayerAnimation[i][0].push(PIXI.Texture.fromFrame(getTextureName(item[0], j)));
		}
		PlayerAnimation[i].push(item[2]);
	});
}