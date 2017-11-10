var socket = io.connect(window.location.href, {secure: true});
var token = undefined;
var chunksGot = 0;

function retrieveToken() {
	var cookie = decodeURIComponent(document.cookie);
	if(cookie && cookie.length) {
		cookie = cookie.split(';');
		token = cookie[0].split('=')[1];
	}
}

retrieveToken();

socket.on('reg-error', function(errText) {
	let errDiv = document.getElementById('errorText');
	errDiv.innerHTML = errText;
	let nickDiv = document.getElementById('nicknameForm');
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
	document.cookie = 'token=' + token + ';expires=' + date + ';path=/';
	activateGame();
});

socket.on('update', function(data) {
	dataUpdated = false;
	gameData = data;
});

socket.on('reg-disconnect', function(id) {
	if(players.has(id)) {
		players.get(id).graphics.forEach(function(item, i, arr) {
			item.unstageFromScene(objects);
		});
		players.get(id).nameSprite.unstageFromScene(objects);
		players.delete(id);
	}
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

function play() {
	var nicknameInput = document.getElementsByName('nickname')[0].value;
	socket.emit('registration', nicknameInput);
}

function activateGame() {
	document.getElementById('nicknameForm').style.display = 'none';
	document.getElementById('inventory').style.display = 'inline';
	isGameActive = 1;
	enableGame();
}

function deactivateGame() {
	document.getElementById('nicknameForm').style.display = 'inline';
	document.getElementById('inventory').style.display = 'none';
	isGameActive = 0;
	if(screenStage) {
		screenStage.removeChild(gameScene);
	}
}