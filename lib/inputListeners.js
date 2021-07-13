// event handler

var mouseState = false;
var lastMouseX = -100, lastMouseY = -100;
function doMouseDown(event) {
	lastMouseX = event.pageX;
	lastMouseY = event.pageY;
	mouseState = true;
    spawnLaser();
}
function doMouseUp(event) {
	lastMouseX = -100;
	lastMouseY = -100;
	mouseState = false;
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

    if (angle > 10) {
        angle = 10;
    }
    else if (angle < -10) {
        angle = -10;
    }
    if (elevation > 10) {
        elevation = 10;
    }
    else if (elevation < -10) {
        elevation = -10;
    }


}
function doMouseWheel(event) {
	var nLookRadius = lookRadius + event.wheelDelta/200.0;
	if((nLookRadius > 2.0) && (nLookRadius < 100.0)) {
		lookRadius = nLookRadius;
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
                    angle = angle - 0.2;
                    //cx = cx - 1;
                    break;
                case 39:
                    angle = angle + 0.2;
                    //cx = cx + 1;
                    break;
                case 38:
                    elevation = elevation + 0.2;
                    //cy = cy + 1; 
                    break;
                case 40:
                    elevation = elevation - 0.2;
                    //cy = cy - 1;
                    break;
                case 81:
                    cz = cz - 1;
                    
                    break;
                case 69:
                    cz = cz + 1;
                      
                    break;
            }
    
            if (angle > 10) {
                angle = 10;
            }
            else if (angle < -10) {
                angle = -10;
            }
            if (elevation > 10) {
                elevation = 10;
            }
            else if (elevation < -10) {
                elevation = -10;
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