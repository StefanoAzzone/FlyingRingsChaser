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
                console.log("KeyDown   - Dir LEFT");
                cz = cz - 1;
                //rvy = rvy - 1.0;
                break;
            case 39:
                console.log("KeyDown   - Dir RIGHT");
                cz = cz + 1;
                //rvy = rvy + 1.0;
                break;
            case 38:
                console.log("KeyDown   - Dir UP");
                cx = cx + 1;
                //rvx = rvx + 1.0;
                break;
            case 40:
                console.log("KeyDown   - Dir DOWN");
                cx = cx - 1;
                //rvx = rvx - 1.0;
                break;
            case 81:
                console.log("KeyDown   - Q Key");
                cy = cy - 1;
                //rvz = rvz + 1.0;
                break;
            case 82:
                console.log("KeyDown   - R Key");
                cy = cy + 1;   
                //rvz = rvz - 1.0;
                break;
            }
        }
    }
  
var keyFunctionUp = function(e) {
    if(keys[e.keyCode]) {
        keys[e.keyCode] = false;
        switch(e.keyCode) {
            case 37:
                console.log("KeyUp     - Dir LEFT");
                //rvy = rvy + 1.0;
                break;
            case 39:
                console.log("KeyUp     - Dir RIGHT");
                //rvy = rvy - 1.0;
                break;
            case 38:
                console.log("KeyUp     - Dir UP");
                //rvx = rvx - 1.0;
                break;
            case 40:
                console.log("KeyUp     - Dir DOWN");
                //rvx = rvx + 1.0;
                break;
            case 81:
                console.log("KeyUp     - Q Key");
                //rvz = rvz - 1.0;
                break;
            case 82:
                console.log("KeyUp     - R Key");
                //rvz = rvz + 1.0;
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