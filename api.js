var cheerio = require('cheerio');
var request = require('request');
var http 	= require('http');
var express = require('express');
var WebSocketServer = require("ws").Server;
var app 	= express();
var geo 	= require('./geo.json');

var locs = Array();

app.use(express.static('public'));

app.get('/data.json', function (req, res) {
	res.send(locs);
});

function getData(){
	console.log('Fetching new data … ');
	request('http://www.parken-mannheim.de/', function (err, res, body) {
		if (!err && res.statusCode == 200) {
			var temp = Array();


			// Parse data
			$ = cheerio.load(body, {
				normalizeWhitespace: true
			});

			// Load all Locations
			$('.parkhaus-lnk').map(function (i, el) {
				temp[i] = Object();
				temp[i]["name"] = $(this).text();
			});
			
			// Parse free spaces
			var freespaces = $('#pls-liste').text().match(/\d+/g);
			freespaces.forEach(function(free, i){
				temp[i]["free"] = free;
			});

			// Add current timestamp and Location
			temp.forEach(function(location, i){
				temp[i]["timestamp"] = new Date();
				temp[i]["location"] = geo[temp[i].name];
			});

			locs = temp;
		}
	});
}
// Get first time data
getData();

// Start Interval (5 mins)
setInterval(getData, 60000);


// Start express server
var port = process.env.PORT || 3000;
var server = http.createServer(app)
server.listen(port, function () {

	var host = server.address().address;

	console.log('App listening at http://%s:%s', "localhost", port);

});

// Start Websocket Setver
var wss = new WebSocketServer({server: server})
console.log("websocket server created")

wss.on("connection", function(ws) {
	var id = setInterval(function() {
		ws.send(JSON.stringify(locs), function() {  });
	}, 30000)

	console.log("websocket connection open")

	ws.on("close", function() {
		console.log("websocket connection close")
		clearInterval(id)
	})
})