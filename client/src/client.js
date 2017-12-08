var socket = io.connect(window.location.href, {secure: true});
var token = undefined;
var chunksGot = 0;

function setup() {
	token = Cookies.get('token');
	socket.emit('requestRooms');
}

setup();

socket.on('reg-error', function(errText) {
	let errDiv = document.getElementById('errorText');
	errDiv.innerHTML = errText;
	let nickDiv = document.getElementById('loginForm');
	nickDiv.style.display = 'inline';
	deactivateGame();
});

socket.on('reg-success', function(key, id, name) {
	console.log("Successfully registered with name: " + name);
	token = key;
	myNick = name;
	myId = id;
	var date = new Date();
	date.setTime(date.getTime() + 60 * 60 * 1000);
	Cookies.set('token', token);
	socket.emit('requestRooms', token);
	document.getElementById('loginForm').style.display = 'none';
	document.getElementById('rooms').style.display = 'inline';
});

socket.on('reg-disconnected', function(id) {
	if(players.has(id)) {
		players.get(id).graphics.forEach(function(item, i, arr) {
			item.unstageFromScene(objects);
		});
		players.get(id).nameSprite.unstageFromScene(objects);
		players.delete(id);
	}
});

socket.on('rooms', function(data) {
	var ol = document.getElementById('serverForm');
	data.forEach(function(item, i, arr) {
		var li = document.createElement('li');
		li.setAttribute('id', 'room' + item.id);
		li.onclick = function() {
			chooseRoom(item.id);
		}
		li.className = 'list-group-item d-flex justify-content-between align-items-center';
		if(item.started) {
			li.className += ' list-group-item-danger';
		}
		else {
			li.className += ' list-group-item-action';
		}
		var span = document.createElement('span');
		span.className = 'badge badge-primary badge-pill';
		span.appendChild(document.createTextNode((item.players[0] + item.players[1]) + ''));
		li.appendChild(document.createTextNode('Room ' + (item.id + 1)));
		li.appendChild(span);
		ol.appendChild(li);
	});
});

socket.on('update', function(data) {
	dataUpdated = false;
	gameData = data;
});

socket.on('map-chunk', function(chunk) {
	map.updateChunk(chunk);
});

socket.on('blockBreaking', function(pos) {
	map.get(pos.x, pos.y).breakMe();
});

socket.on('requestToken', function() {
	if(token) {
		socket.emit('returnToken', token);
	}
});

socket.on('updateRoom', function(data) {
	document.getElementById('rooms').style.display = 'none';
	document.getElementById('room').style.display = 'grid';
	var olp = document.getElementById('roomPlayers');
	var olv = document.getElementById('roomViruses');
	olp.innerHTML = "";
	olv.innerHTML = "";
	data.forEach(function(item, i, arr) {
		var li = document.createElement('li');
		li.appendChild(document.createTextNode(item.name));
		li.className = 'list-group-item';
		if(item.ready) {
			li.className += ' list-group-item-success'
		}
		if(item.side == 0) {
			olp.appendChild(li);
		}
		else {
			olv.appendChild(li);
		}
	});
});

socket.on('gameStarted', function() {
	activateGame();
});

function play() {
	var nicknameInput = document.getElementsByName('nickname')[0].value;
	socket.emit('registration', nicknameInput, 0);
}

function activateGame() {
	document.getElementById('loginForm').style.display = 'none';
	document.getElementById('room').style.display = 'none';
	document.getElementById('rooms').style.display = 'none';
	document.getElementById('inventory').style.display = 'inline';
	isGameActive = true;
	enableGame();
}

function deactivateGame() {
	document.getElementById('loginForm').style.display = 'inline';
	document.getElementById('inventory').style.display = 'none';
	isGameActive = false;
	if(screenStage) {
		screenStage.removeChild(gameScene);
	}
	map = new GameMap();
}

function chooseRoom(id) {
	socket.emit('joinRoom', token, id);
}

function leave() {
	socket.emit('leaveRoom', token);
	document.getElementById('rooms').style.display = 'inline';
	document.getElementById('room').style.display = 'none';
}

var isReady = false;

function ready() {
	isReady = !isReady;
	socket.emit('ready', token, isReady);
}

function switchSide() {
	socket.emit('switchSide', token);
}