var socket = io.connect(window.location.href, {secure: true});
var token = undefined;

socket.on('reg-error', function(errText) {
	let errDiv = document.getElementById('errorText');
	errDiv.innerHTML = errText;
	let nickDiv = document.getElementById('nicknameForm');
	nickDiv.style.display = 'inline';
});

socket.on('reg-success', function(key, id, name) {
	token = key;
	let nickDiv = document.getElementById('nicknameForm');
	nickDiv.style.display = 'none';
	myNick = name;
	myId = id;
	activateGame();
});

socket.on('update', function(data) {
	dataUpdated = false;
	gameData = data;
});

socket.on('reg-disconnect', function(id) {
	if(players.has(id)) {
		players.get(id).graphics.unstageFromScene(objects);
		players.get(id).nameSprite.unstageFromScene(objects);
		players.delete(id);
	}
});

socket.on('map', function(nmap) {
	if(!map) { 
		map = [];
		nmap.forEach(function(row, i, maparr) {
			map.push([]);
			row.forEach(function(item, j, rowarr) {
				map[i].push(new Block());
			});
		});
	}
	nmap.forEach(function(row, i, maparr) {
		row.forEach(function(item, j, rowarr) {
			map[i][j].update(item);
		});
	});
});

function play() {
	var nicknameInput = document.getElementsByName('nickname')[0].value;
	socket.emit('registration', nicknameInput);
}

function activateGame() {
	isGameActive = 1;
	screenStage.addChild(gameScene);
	lastTickTime = new Date().getTime();
}