var socket = io.connect(window.location.href, {secure: true});
var token = undefined;
var myNick = undefined;
var myId = undefined;

socket.on('reg-error', function (errText) {
	let errDiv = document.getElementById('errorText');
	errDiv.innerHTML = errText;
	let nickDiv = document.getElementById('nicknameForm');
	nickDiv.style.display = 'inline';
});

socket.on('reg-success', function (key, id, name) {
	token = key;
	let nickDiv = document.getElementById('nicknameForm');
	nickDiv.style.display = 'none';
	myNick = name;
	myId = id;
	activateGame();
});

socket.on('update', function (data) {
	/*if(data[0] == 0) {
		for(let item of users) {
			item.updated = false;
		}
		data.forEach(function (item, i, arr) {
			if(item == 0) return;
			if(!users.has(item.id)) {
				let pl = new Player();
				pl.name = item.name;
				pl.text.text = item.name;
				users.set(item.id, pl);
				objects.addChild(pl.sprite);
				objects.addChild(pl.text);
			}
			users.get(item.id).updated = true;
			setPlayerCoords(users.get(item.id), item.coords);
		});
		for(let item of users) {
			if(!item.updated) {
				objects.removeChild(item.sprite);
				objects.removeChild(item.text);
				users.delete(item.id);
			}
		}
	}
	else {
		data.forEach(function(item, i, arr) {
			if(item == 1) return;
			platforms.push(item);
		});
	}*/
});

function play() {
	var nicknameInput = document.getElementsByName('nickname')[0].value;
	socket.emit('registration', nicknameInput);
}

function activateGame() {
	isGameActive = 1;
	stage.addChild(objects);
}