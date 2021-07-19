class Quad {
	
	constructor(x, y, z, size) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.size = size;
		this.explosionAnimTime = 3.0;
		this.active = true;
		this.newTime;
	}

    update(delta) {
		if(this.active) {
			this.z += delta * speed * shipSpeed * Math.cos(utils.degToRad(elevation)) * Math.cos(utils.degToRad(angle));
			this.newTime = this.explosionAnimTime - delta * 0.05;
			if(this.newTime <= 0) {
				this.active = false;
				this.newTime = 0;
			}
			this.explosionAnimTime = this.newTime;
		}
    }
}