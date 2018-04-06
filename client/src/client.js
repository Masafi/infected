//Vars
var socket = io.connect(window.location.href, { secure: true });
var token = undefined;
var chunksGot = 0;
var team = false;
var side = 0;
var roomId = 0;
var isReady = false;
var tps = 0;

//Setup
function setup() {
	token = Cookies.get('token');
	socket.emit('requestRooms');
}

setup();

//Error with registration and/or token handler
socket.on('reg-error', function(errText) {
	//$('#login-error').html('<b>Error:</b> ' + errText);
	//$('#login-error').show();
	deactivateGame(true);
});

//Success registration handler
socket.on('reg-success', function(key, id, name) {
	console.log("Successfully registered with name: " + name);
	token = key;
	myNick = name;
	myId = id;
	Cookies.set('token', token);
	socket.emit('requestRooms', token);
	$('#login-input').removeClass('is-invalid');
	$('#login-form').hide();
	$('#rooms-form').show();
});

//Player disconnected handler
//Now not used
socket.on('reg-disconnected', function(id) {
	if (players.has(id)) {
		players.get(id).graphics.forEach(function(item, i, arr) {
			item.unstageFromScene(objects);
		});
		players.get(id).nameSprite.unstageFromScene(objects);
		players.delete(id);
	}
});

//Gets rooms list from server
socket.on('rooms', function(data) {
	$('#rooms-list').empty();
	data.forEach(function(item, i, arr) {
		var element = $('#rooms-list-item > *').clone();
		element.prepend('Room ' + (item.id + 1));
		element.find('span').text((item.players[0] + item.players[1]).toString());
		element.click(function() {
			chooseRoom(item.id);
		});
		if(item.started) {
			element.addClass('active');
			element.find('span').removeClass('badge-primary');
			element.find('span').addClass('badge-light text-primary');
		}
		$('#rooms-list').append(element);
	});
});

//Game update
socket.on('update', function(data) {
	tps++;
	dataUpdated = false;
	gameData = data;
});

//If user is a virus updater
socket.on('update-virus', function(data) {
	virus.update(data);
});

//Server sent a chunk
socket.on('map-chunk', function(chunk) {
	map.updateChunk(chunk);
});

//Block breaking event handler
socket.on('blockBreaking', function(pos, koef) {
	map.get(pos.x, pos.y).breakMe(koef);
});

//Sends token to server
socket.on('requestToken', function() {
	if (token) {
		socket.emit('returnToken', token);
	}
});

//Updates current room
socket.on('updateRoom', function(data, id) {
	if(!isGameStarted) {
		$('#players-list-humans').empty();
		$('#players-list-virus').empty();
		$('#ready-button').removeClass('disabled');
		$('#rooms-form').hide();
		$('#players-form').show();
		$('#players-form').find('h4').text('Room ' + (id + 1));
		data.forEach(function(item, i, arr) {
			var parent = item.side ? $('#players-list-virus') : $('#players-list-humans');
			var element = $('#players-list-item > *').clone();
			element.prepend(item.name);
			if(item.ready) element.find('span').show();
			parent.append(element);
		});
	}
});

//Game started event handler
socket.on('gameStarted', function(_side, _roomId) {
	side = _side;
	roomId = _roomId;
	activateGame();
});

//Block update event handler
socket.on('blockUpdate', function(data) {
	map.updateBlockData(data);
});

//Game over event handler
socket.on('gameOver', function() {
	deactivateGame(false);
});

//Play (register) button event handler
function play() {
	nickname = $('#login-input').val();
	socket.emit('registration', nickname, +team);
}

//Removes room GUI and shows game GUI
function activateGame() {
	$('#rooms-form').hide();
	$('#login-form').hide();
	$('#players-form').hide();
	document.getElementById('inventory').style.display = 'inline';
	isGameActive = true;
	enableGame();
}

//Clears game stage
function eraseStage(stage) {
	if(stage) {
		for (var i = stage.children.length - 1; i >= 0; i--) {	
			stage.removeChild(stage.children[i]);
		}
	}
}

//Deactivates game
//Removes game GUI and shows room GUI
function deactivateGame(force) {
	if(force) {
		$('#login-form').show();
	}
	else {
		$('#rooms-form').show();
		socket.emit('requestRooms', token);
	}
	isReady = false;
	document.getElementById('inventory').style.display = 'none';
	if(isGameStarted) {
		if (screenStage) {
			screenStage.removeChild(gameScene);
		}
		eraseStage(objects);
		if(chunkScenes) {
			chunkScenes.forEach(function(item, i, arr) {
				item.forEach(function(stage, j, arr) {
					eraseStage(stage);
				});
			});
		}
		console.log("Game over!");
		map.recreate();
		players = new Map();
	}

	isGameActive = false;
	isGameStarted = false;
}

function chooseRoom(id) {
	socket.emit('joinRoom', token, id);
}

function leave() {
	socket.emit('leaveRoom', token);
	$('#players-form').hide();
	$('#rooms-form').show();
	socket.emit('requestRooms', token);
}

function ready() {
	isReady = !isReady;
	socket.emit('ready', token, isReady);
}

function joinSide(team) {
	socket.emit('joinSide', token, team);
}

$(document).ready(function() {
	// Обработчик кнопки авторизации
	$('#login-button').click(play);

	// Выход с комнаты
	$('#leave-button').click(leave);

	// Кнопка ready
	$('#ready-button').click(ready);
});