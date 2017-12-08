var socket = io.connect(window.location.href, { secure: true });
var token = undefined;
var chunksGot = 0;
var team = false;

function setup() {
	token = Cookies.get('token');
	socket.emit('requestRooms');
}

setup();

socket.on('reg-error', function(errText) {
	$('#login-error').html('<b>Error:</b> ' + errText);
	$('#login-error').show();
	deactivateGame(true);
});

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

socket.on('reg-disconnected', function(id) {
	if (players.has(id)) {
		players.get(id).graphics.forEach(function(item, i, arr) {
			item.unstageFromScene(objects);
		});
		players.get(id).nameSprite.unstageFromScene(objects);
		players.delete(id);
	}
});

socket.on('rooms', function(data) {
	if(!isGameStarted) {
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
	}
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
	if (token) {
		socket.emit('returnToken', token);
	}
});

socket.on('updateRoom', function(data, id) {
	$('#players-list-humans > *:not(:first)').remove();
	$('#players-list-virus > *:not(:first)').remove();
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
});

socket.on('gameStarted', function() {
	activateGame();
});

socket.on('blockUpdate', function(data) {
	map.updateBlockData(data);
});

socket.on('gameOver', function() {
	deactivateGame(false);
});

function play() {
	nickname = $('#login-input').val();
	socket.emit('registration', nickname, +team);
}

function activateGame() {
	$('#rooms-form').hide();
	$('#login-form').hide();
	$('#players-form').hide();
	document.getElementById('inventory').style.display = 'inline';
	isGameActive = true;
	enableGame();
}

function deactivateGame(force) {
	if(force) $('#login-form').show();
	else $('rooms-form').show();
	document.getElementById('inventory').style.display = 'none';
	isGameActive = false;
	isGameStarted = false;
	if (screenStage) {
		screenStage.removeChild(gameScene);
	}
	map = new GameMap();
}

function chooseRoom(id) {
	socket.emit('joinRoom', token, id);
}

function leave() {
	socket.emit('leaveRoom', token);
	$('#players-form').hide();
	$('#rooms-form').show();
}

var isReady = false;

function ready() {
	isReady = !isReady;
	socket.emit('ready', token, isReady);
}

function switchSide() {
	socket.emit('switchSide', token);
}

$(document).ready(function() {
	// Обработчик кнопки авторизации
	$('#login-button').click(play);

	// Выбор команды
	function toggleTeam() {
		team = !team;
		$('#login-humans-button').toggle();
		$('#login-virus-button').toggle();
	}
	$('#login-humans-button').click(toggleTeam);
	$('#login-virus-button').click(toggleTeam);

	// Выход с хаты
	$('#leave-button').click(leave);

	// Смена команды
	$('#switch-team-button').click(switchSide);

	// Кнопка ready
	$('#ready-button').click(ready);
});