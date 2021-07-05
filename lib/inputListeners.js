// event handler

var mouseState = false;
var lastMouseX = -100, lastMouseY = -100;
function doMouseDown(event) {
	lastMouseX = event.pageX;
	lastMouseY = event.pageY;
	mouseState = true;
}
function doMouseUp(event) {
	lastMouseX = -100;
	lastMouseY = -100;
	mouseState = false;
}
function doMouseMove(event) {
	if(locked) {
		var dx = event.movementX;
		var dy = event.movementY;
		
		if((dx != 0) || (dy != 0)) {
			angle = angle + 0.5 * dx;
			elevation = elevation - 0.5 * dy;
		}
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
        keys[e.keyCode] = true;
        switch(e.keyCode) {
            case 37:
                angle = angle - 0.5;
                //cx = cx - 1;
                break;
            case 39:
                angle = angle + 0.5;
                //cx = cx + 1;
                break;
            case 38:
                elevation = elevation + 0.5;
                //cy = cy + 1; 
                break;
            case 40:
                elevation = elevation - 0.5;
                //cy = cy - 1;
                break;
            case 81:
                cz = cz - 1;
                
                break;
            case 69:
                cz = cz + 1;
                  
                break;
            }
        }
    }
  
var keyFunctionUp = function(e) {
    if(keys[e.keyCode]) {
        keys[e.keyCode] = false;
        switch(e.keyCode) {
            case 37:
                //console.log("KeyUp     - Dir LEFT");
                break;
            case 39:
                //console.log("KeyUp     - Dir RIGHT");
                break;
            case 38:
                //console.log("KeyUp     - Dir UP");
                break;
            case 40:
                //console.log("KeyUp     - Dir DOWN");
                break;
            case 81:
                //console.log("KeyUp     - Q Key");
                break;
            case 69:
                //console.log("KeyUp     - E Key");
                break;
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