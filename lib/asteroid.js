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
		this.Q = new Quaternion(1, 0, 0, 0);
        this.active = active;
	}

    update(delta) {
        if (this.z > despawnDistance) this.active = false;
        else {
            this.z += delta * speed * Math.cos(utils.degToRad(elevation)) * Math.cos(utils.degToRad(angle));
            this.x += delta * this.xSpeed;
            this.y += delta * this.ySpeed;
	
			var dQ = Quaternion.fromEuler(delta * utils.degToRad(this.zRotation), delta * utils.degToRad(this.xRotation),
										  delta * utils.degToRad(this.yRotation));
			this.Q = dQ.mul(this.Q);
        }
    }

	getRotationMatrix(){
		return this.Q.toMatrix4(false);
	}
}