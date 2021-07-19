class Ring {
	
	constructor(x, y, active) {
		this.x = x;
		this.y = y;
		this.z = maxSpawnDistance;
        this.active = active;
	}

    update(delta) {
        if (this.z > despawnDistance) this.active = false;
		else this.z += delta * speed * shipSpeed * Math.cos(utils.degToRad(elevation)) * Math.cos(utils.degToRad(angle));
    }
}