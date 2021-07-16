class Asteroid {
	
	constructor(x, y, z, xSpeed, ySpeed, size, xRotation, yRotation, zRotation, type, fadeInTime, active) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.xSpeed = xSpeed;
		this.ySpeed = ySpeed;
		this.size = size;
		this.xRotation = xRotation;
		this.yRotation = yRotation;
		this.zRotation = zRotation;
		this.Q = new Quaternion(1, 0, 0, 0);
		this.active = active;
		this.type = type;
		this.fadeInTime = fadeInTime;
		this.explosionAnimTime = 3.0;
	}

    update(delta) {
		this.z += delta * speed * shipSpeed * Math.cos(utils.degToRad(elevation)) * Math.cos(utils.degToRad(angle));
		this.x += delta * this.xSpeed;
		this.y += delta * this.ySpeed;

		var dQ = Quaternion.fromEuler(delta * utils.degToRad(this.zRotation), delta * utils.degToRad(this.xRotation),
									  delta * utils.degToRad(this.yRotation));
		this.Q = dQ.mul(this.Q);
		if(this.fadeInTime + delta * 0.1 < 1.0) {
			this.fadeInTime += delta * 0.03;
		}
		else this.fadeInTime = 1.0;

		if (this.z > despawnDistance) this.active = false;
    }

	getRotationMatrix(){
		return this.Q.toMatrix4(false);
	}
}