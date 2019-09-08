
class Physics {
	constuctor() {

	}

	collision(that, dt) {
		var relv = this.vel.sub(that.vel);
		var bigBox = new PhysicPrimitive();
		bigBox.pos = this.pos.min(this.updatePosition(relv, dt));
		bigBox.size = this.pos.max(this.updatePosition(relv, dt)).add(this.size).sub(bigBox.pos);
		var retVal = {};
		if (bigBox.intersects(that)) {
			var invEntry = new Vector2(0, 0);
			var invExit = new Vector2(0, 0);
			if (relv.x >= 0) {
				invEntry.x = that.pos.x - (this.pos.x + this.size.x);
				invExit.x = (that.pos.x + that.size.x) - this.pos.x;
			} else {
				invEntry.x = (that.pos.x + that.size.x) - this.pos.x;
				invExit.x = that.pos.x - (this.pos.x + this.size.x);
			}
			if (relv.y >= 0) {
				invEntry.y = that.pos.y - (this.pos.y + this.size.y);
				invExit.y = (that.pos.y + that.size.y) - this.pos.y;
			} else {
				invEntry.y = (that.pos.y + that.size.y) - this.pos.y;
				invExit.y = that.pos.y - (this.pos.y + this.size.y);
			}
			var entry = new Vector2(0, 0);
			var exit = new Vector2(0, 0);
			if (relv.x == 0) {
				entry.x = (invEntry.x > 0 ? 1 : -1) * (dt + 1);
				exit.x = (invExit.x > 0 ? 1 : -1) * (dt + 1);
			} else {
				entry.x = invEntry.x / relv.x;
				exit.x = invExit.x / relv.x;
			}
			if (relv.y == 0) {
				entry.y = (invEntry.y > 0 ? 1 : -1) * (dt + 1);
				exit.y = (invExit.y > 0 ? 1 : -1) * (dt + 1);
			} else {
				entry.y = invEntry.y / relv.y;
				exit.y = invExit.y / relv.y;
			}
			var entryTime = Math.max(entry.x, entry.y);
			var exitTime = Math.min(exit.x, exit.y);
			var normal = new Vector2(1, 1);
			if (entryTime > exitTime || entry.x < -eps && entry.y < -eps || entry.x - dt > eps || entry.y - dt > eps) {
				retVal.dt = dt + 1;
				retVal.proj = new Vector2(1, 1);
				return retVal;
			} else {
				if (entry.x - eps > entry.y) {
					if (relv.x >= 0) {
						normal = new Vector2(-1, 0);
					} else {
						normal = new Vector2(1, 0);
					}
				} else {
					if (relv.y >= 0) {
						normal = new Vector2(0, -1);
					} else {
						normal = new Vector2(0, 1);
					}
				}
				retVal.dt = entryTime;
				retVal.proj = normal;
				return retVal;
			}
		}
		else {
			retVal.dt = dt + 1;
			retVal.proj = new Vector2(1, 1);
			return retVal;
		}
	}

	AABBintersects(a, b) {
		return   !(a.pos.x > b.pos.x + b.size.x
				|| a.pos.x + a.size.x < b.pos.x
				|| a.pos.y > b.pos.y + b.size.y
				|| a.pos.y + a.size.y < b.pos.y);
	}
}