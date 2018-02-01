var fs = require('fs');

class Vector2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	add(v) {
		return new Vector2(this.x + v.x, this.y + v.y);
	}

	sub(v) {
		return new Vector2(this.x - v.x, this.y - v.y);
	}

	neg() {
		return new Vector2(-this.x, -this.y);
	}

	mul(v) {
		return new Vector2(this.x * v.x, this.y * v.y);
	}

	div(v) {
		return new Vector2(this.x / v.x, this.y / v.y);
	}

	mula(v) {
		return new Vector2(this.x * v, this.y * v);
	}

	diva(v) {
		return new Vector2(this.x / v, this.y / v);
	}

	max(v) {
		return new Vector2(Math.max(this.x, v.x), Math.max(this.y, v.y));
	}

	min(v) {
		return new Vector2(Math.min(this.x, v.x), Math.min(this.y, v.y));
	}

	toArr() {
		return [this.x, this.y];
	}

	abs() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
}


const chunkSize = 8;
const maxHeight = 15;

var mapSize = new Vector2(512, 128);
var CellSize = new Vector2(16, 16);

var perlinNoise = new function() {
	this.noise = function(x, y, z) {
		var p = new Array(512);
		var permutation = [151, 160, 137, 91, 90, 15,
			131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
			190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
			88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
			77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
			102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
			135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
			5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
			223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
			129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
			251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
			49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
			138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
		];
		for (var i = 0; i < 256; i++)
			p[256 + i] = p[i] = permutation[i];

		var X = Math.floor(x) & 255, // FIND UNIT CUBE THAT
			Y = Math.floor(y) & 255, // CONTAINS POINT.
			Z = Math.floor(z) & 255;
		x -= Math.floor(x); // FIND RELATIVE X,Y,Z
		y -= Math.floor(y); // OF POINT IN CUBE.
		z -= Math.floor(z);
		var u = fade(x), // COMPUTE FADE CURVES
			v = fade(y), // FOR EACH OF X,Y,Z.
			w = fade(z);
		var A = p[X] + Y,
			AA = p[A] + Z,
			AB = p[A + 1] + Z, // HASH COORDINATES OF
			B = p[X + 1] + Y,
			BA = p[B] + Z,
			BB = p[B + 1] + Z; // THE 8 CUBE CORNERS,

		return scale(lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), // AND ADD
					grad(p[BA], x - 1, y, z)), // BLENDED
				lerp(u, grad(p[AB], x, y - 1, z), // RESULTS
					grad(p[BB], x - 1, y - 1, z))), // FROM  8
			lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), // CORNERS
					grad(p[BA + 1], x - 1, y, z - 1)), // OF CUBE
				lerp(u, grad(p[AB + 1], x, y - 1, z - 1),
					grad(p[BB + 1], x - 1, y - 1, z - 1)))));
	}

	function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

	function lerp(t, a, b) { return a + t * (b - a); }

	function grad(hash, x, y, z) {
		var h = hash & 15; // CONVERT LO 4 BITS OF HASH CODE
		var u = h < 8 ? x : y, // INTO 12 GRADIENT DIRECTIONS.
			v = h < 4 ? y : h == 12 || h == 14 ? x : z;
		return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
	}

	function scale(n) { return (1 + n) / 2; }
}

class GameMap {
	constructor() {
		this.map = [];
		for (let i = 0; i < mapSize.x; i++) {
			this.map.push([]);
			for (let j = 0; j < mapSize.y; j++) {
				this.map[i].push(0);
			}
		}
	}

	generateMap() {
		var height = [];
		var seed = Math.random() * 10;
		var yOffset = 15;
		var self = this;
		for (let i = 0; i < mapSize.x; i++) {
			height.push(Math.floor(perlinNoise.noise(i / 10, seed, seed) * maxHeight + 1));
		}
		for (let i = 0; i < mapSize.x; i++) {
			for (let j = 0; j < maxHeight + 1; j++) {
				if (height[i] >= maxHeight - j) {
					var curRand = Math.random() * 100;
					if (curRand < 50) {
						var flower = Math.min(5, Math.floor(Math.random() * 6));
						this.map[i, j - 1 + yOffset] = 4 + flower;
					} else if (curRand < 60) {
						this.map[i, j - 1 + yOffset] = 11;
					}
					this.map[i, j + yOffset] = 1;
					this.map[i, j + 1 + yOffset] = 2;
					this.map[i, j + 2 + yOffset] = 2;
					var curRand = Math.random() * 10;
					if (curRand <= 5) {
						this.map[i, j + 3 + yOffset] = 2;
						if (curRand <= 2) {
							this.map[i, j + 4 + yOffset] = 2;
						}
					}
					break;
				}
			}
			for (let j = 1; j < maxHeight + 2 + yOffset; j++) {
				if (this.map[i, j - 1] >= 1 && this.map[i, j] == 0) {
					this.map[i, j] = 3;
				}
			}
			for (let j = maxHeight + 2 + yOffset; j < mapSize.y; j++) {
				var curNoise = perlinNoise.noise(i / 10, j / 10, seed) * 100;
				if (curNoise <= Math.max(60, 100 - j)) {
					this.map[i, j] = 3;
				}
			}
		}
		var withoutTree = 0;
		for (let i = 0; i < mapSize.x; i++) {
			if (this.checkCoords(i - 1, 0) && this.checkCoords(i + 1, 0)) {
				for (let j = yOffset; j < mapSize.y; j++) {
					if (this.map[i, j] == 1) {
						if (this.map[i - 1, j] == 1 && this.map[i + 1, j] == 1) {
							if (Math.random() * 250 <= withoutTree) {
								this.map[i, j - 1] = 10;
								withoutTree = -2;
							}
						}
						break;
					}
				}
			}
			withoutTree++;
			for (let j = maxHeight + 1 + yOffset; j < mapSize.y; j++) {
				var check = function(a, b) {
					return (self.checkCoords(a, b) && self.map[a, b] == 0);
				}
				var count = check(i - 1, j) || check(i + 1, j) || check(i, j - 1) || check(i, j + 1);
				if (count && this.map[i, j] != 0) {
					this.map[i, j] = 2;
				}
			}
		}
		
		fs.writeFile("/tmp/test", "Hey there!", function(err) {
			if (err) {
				return console.log(err);
			}

			console.log("The file was saved!");
		});
	}

	checkCoords(i, j) {
		return i >= 0 && j >= 0 && i < mapSize.x && j < mapSize.y;
	}
}