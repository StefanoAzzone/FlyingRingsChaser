// event handler

var lastMouseX = -100, lastMouseY = -100;
const moveBoundary = 15;
function doMouseDown(event) {
	lastMouseX = event.pageX;
	lastMouseY = event.pageY;
    switch (event.which) {
        case 1:
            // alert('Left Mouse button pressed.');
            spawnLaser();
            break;
        case 2:
            // alert('Middle Mouse button pressed.');
            break;
        case 3:
            // alert('Right Mouse button pressed.');
            if(energy >= cost)
                boost = true;
            break;
        default:
            alert('You have a strange Mouse!');
    }
}

function doMouseUp(event) {
	lastMouseX = -100;
	lastMouseY = -100;
    if(event.which == 3) {
        boost = false;
        shipSpeed = 1;
    }
}
function doMouseMove(event) {
	if(locked && !dead) {
		var dx = event.movementX;
		var dy = event.movementY;
		
		if((dx != 0) || (dy != 0)) {
			angle = angle + 0.05 * dx;
			elevation = elevation - 0.05 * dy;
		}
	}

    if (angle > moveBoundary) {
        angle = moveBoundary;
    }
    else if (angle < -moveBoundary) {
        angle = -moveBoundary;
    }
    if (elevation > moveBoundary) {
        elevation = moveBoundary;
    }
    else if (elevation < -moveBoundary) {
        elevation = -moveBoundary;
    }

}

var keys = [];
//var rvx = 0.0;
//var rvy = 0.0;
//var rvz = 0.0;

var keyFunctionDown = function(e) {
    if(!keys[e.keyCode]) {
        keys[e.keyCode]  = true;
    }
}
  
var keyFunctionUp = function(e) {
    if(keys[e.keyCode]) {
        keys[e.keyCode] = false;
    }
}

function updateDirection() {
    for(var i = 0; i < keys.length; i++) {
        if (keys[i] && locked && !dead) {
            switch(i) {
                case 37:
                    angle = angle - 0.4;
                    //cx = cx - 1;
                    break;
                case 39:
                    angle = angle + 0.4;
                    //cx = cx + 1;
                    break;
                case 38:
                    elevation = elevation + 0.4;
                    //cy = cy + 1; 
                    break;
                case 40:
                    elevation = elevation - 0.4;
                    //cy = cy - 1;
                    break;
                case 81:
                    cz = cz - 1;
                    
                    break;
                case 69:
                    cz = cz + 1;
                      
                    break;
            }
    
            if (angle > moveBoundary) {
                angle = moveBoundary;
            }
            else if (angle < -moveBoundary) {
                angle = -moveBoundary;
            }
            if (elevation > moveBoundary) {
                elevation = moveBoundary;
            }
            else if (elevation < -moveBoundary) {
                elevation = -moveBoundary;
            }
        }
    }
}










/*
var wireframeMode = 0;
var keyFunction = function(e) {
	//	if (e.keyCode == 32) {	// Space
	//		wireframeMode = (wireframeMode + 1) % visTypes.length;
	//	}
	//	output.innerHTML = visTypes[wireframeMode];
}
window.addEventListener("keyup", keyFunction, false);
*/