class Quad {
	
	constructor(x, y, z, size) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.size = size;
		this.explosionAnimTime = 3.0;
	}

    update(delta) {
		this.z += delta * speed * shipSpeed * Math.cos(utils.degToRad(elevation)) * Math.cos(utils.degToRad(angle));

        this.explosionAnimTime -= delta * 0.05;
	
        if (this.explosionAnimTime <= 0) {
            quads.splice(quads.indexOf(this), 1);
            
        }
    }
}