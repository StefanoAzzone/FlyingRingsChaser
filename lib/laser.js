class Laser {
	
	constructor(pos, lAngle, lElevation, active) {
		this.pos = pos;
		this.lAngle = lAngle;
		this.lElevation = lElevation;
        this.active = active;
	}

    update(delta) {
        if (this.pos[2] < -150) this.active = false;
        else {
			var laserSpeed = 1;
            
            this.pos[0] += delta * laserSpeed * Math.sin(utils.degToRad(this.lAngle));
            this.pos[1] += delta * laserSpeed * Math.sin(utils.degToRad(this.lElevation));
            this.pos[2] -= delta * laserSpeed * Math.cos(utils.degToRad(this.lElevation)) * Math.cos(utils.degToRad(this.lAngle));
        }
    }
}