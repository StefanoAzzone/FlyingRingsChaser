class Laser {
	
	constructor(pos, dir, active) {
		this.pos = pos;
		this.dir = dir;
        this.active = active;
	}

    update(delta) {
        if (this.pos[2] < -150) this.active = false;
        else {
			var laserSpeed = 0.1;
            this.pos[0] += delta * laserSpeed * this.dir[0];
            this.pos[1] += delta * laserSpeed * this.dir[1];
            this.pos[2] += delta * laserSpeed * this.dir[2];
        }
    }
}