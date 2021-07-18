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
        switch(e.keyCode) {
            case 16:
                if(energy >= cost)
                    boost = true;
                break;
                case 32:
                spawnLaser();
                break;
        }
    }
}
  
var keyFunctionUp = function(e) {
    if(keys[e.keyCode]) {
        keys[e.keyCode] = false;
        if(e.keyCode == 16) {
            boost = false;
        }
    }
}

function updateDirection(delta) {
    for(var i = 0; i < keys.length; i++) {
        if (keys[i] && locked && !dead) {
            switch(i) {
                case 65:
                    angle = angle - delta;
                    //cx = cx - 1;
                    break;
                case 68:
                    angle = angle + delta;
                    //cx = cx + 1;
                    break;
                case 87:
                    elevation = elevation + delta;
                    //cy = cy + 1; 
                    break;
                case 83:
                    elevation = elevation - delta;
                    //cy = cy - 1;
                    break;
                case 81:
                    //cz = cz - 1;
                    
                    break;
                case 69:
                    //cz = cz + 1;
                      
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