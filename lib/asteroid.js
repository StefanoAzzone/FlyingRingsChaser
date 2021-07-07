class Asteroid {
	constructor(x, y, xSpeed, ySpeed, size, xRotation, yRotation, zRotation, active) {
		this.x = x;
		this.y = y;
		this.z = maxSpawnDistance;
		this.xSpeed = xSpeed;
		this.ySpeed = ySpeed;
		this.size = size;
		this.xRotation = xRotation;
		this.yRotation = yRotation;
		this.zRotation = zRotation;
		this.currentXRotation = 0.0;
		this.currentYRotation = 0.0;
		this.currentZRotation = 0.0;
        this.active = active;
	}

    update(delta) {
        if (this.z > despawnDistance) this.active = false;
        else {
            this.z += delta * speed * Math.cos(utils.degToRad(elevation)) * Math.cos(utils.degToRad(angle));
            this.x += delta * this.xSpeed;
            this.y += delta * this.ySpeed;
            this.currentXRotation += delta * this.xRotation;
            this.currentYRotation += delta * this.yRotation;
            this.currentZRotation += delta * this.zRotation;
            //TODO: switch to quaternions
        }
    }
}