var x = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
var y = window.innerHeight|| document.documentElement.clientHeight|| document.getElementsByTagName('body')[0].clientHeight;
var renderer = PIXI.autoDetectRenderer(x, y);

document.body.appendChild(renderer.view);

var stage = new PIXI.Container();

renderer.render(stage);