//namspace start
const Input = (() => {

const KeysPressed = {}
//Map of keys and their's keycodes
const Keycodes = [[87, 'w'], [65, 'a'], [83, 's'], [68, 'd'], [32, ' '], [49, '1'], [50, '2'], [51, '3'], [52, '4']]

//Keyboard handler
function keyboard(keyCode, ch, local) {
	let key = {};
	key.code = keyCode;
	key.isDown = false;
	key.isUp = true;
	key.press = undefined;
	key.release = undefined;
	key.char = ch;
	key.local = local;
	//The `downHandler`
	key.downHandler = function(event) {
		if (event.keyCode === key.code) {
			if (key.isUp) {
				if(key.press) key.press(ch);
				if(!key.local && IsGameActive) {
					//socket.emit("keyboard", ch, true, token);
				}
				KeysPressed[keyCode] = true;
			}
			key.isDown = true;
			key.isUp = false;
		}
	};

	//The `upHandler`
	key.upHandler = function(event) {
		if (event.keyCode === key.code) {
			if (key.isDown) {
				if(key.release) key.release(ch);
				if(!key.local && IsGameActive) {
					//socket.emit("keyboard", ch, false, token);
				}
				KeysPressed[keyCode] = false;
			}
			key.isDown = false;
			key.isUp = true;
		}
	};

	//Attach event listeners
	window.addEventListener("keydown", key.downHandler.bind(key), false);
	window.addEventListener("keyup", key.upHandler.bind(key), false);
	return key;
}

//Mouse handler
function onMouseDown(event, canvas) {
	if(IsGameActive) {
		let pos = new Vector();
		pos.x = event.pageX - canvas.offsetLeft;
		pos.y = event.pageY - canvas.offsetTop;
		//socket.emit("mouse", pos.div(new Vector(GlobalScale, GlobalScale)).add(camera), event.button, currentState, token);
	}
}

//Mouse handler
function onMouseMoved(event, canvas) {
	if(IsGameActive) {
		let pos = new Vector();
		pos.x = event.pageX - canvas.offsetLeft;
		pos.y = event.pageY - canvas.offsetTop;
		//TODO:
		//selectBorder.screenPos = pos;
	}
}

const wKey = keyboard(Keycodes[0][0], Keycodes[0][1], false)
const aKey = keyboard(Keycodes[1][0], Keycodes[1][1], false)
const sKey = keyboard(Keycodes[2][0], Keycodes[2][1], false)
const dKey = keyboard(Keycodes[3][0], Keycodes[3][1], false)
const spaceKey = keyboard(Keycodes[4][0], Keycodes[4][1], false)
const numberKeys = []
for(let i = 0; i < 4; i++) {
	numberKeys.push(keyboard(Keycodes[5 + i][0], Keycodes[5 + i][1], true))
}

return {
	keyboard,
	onMouseDown,
	onMouseMoved,
	keys: {
		wKey,
		aKey,
		sKey,
		dKey,
		spaceKey,
		numberKeys
	}
}

})()
//namspace end
