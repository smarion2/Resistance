var webSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');

var webSocketSeverPort = 1337;
var app = express();

var sessions = [];

app.use(express.static(__dirname));

app.listen(3000);

var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(webSocketSeverPort, function () {
    console.log(new Date() + " Server is listening on port " + webSocketSeverPort);
});

var wsServer = new webSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

wsServer.on('request', function (request) {
    var connection = request.accept('echo-protocol', request.origin);
    console.log(new Date() + ' Connection accepted.');

    connection.on('message', function (message) {
        var parsedMessage = JSON.parse(message.utf8Data).messageType;
        console.log('mesesage recieved ' + parsedMessage);
        if (message.type === 'utf8') {
            switch (parsedMessage) {
                case 'createGame':
                    console.log('creating game!');
                    connection.sendUTF(createGameId());
                    break;
                case 'joinGame':
                    break;
                case 'missionSelection':
                    break;
                case 'missionVote':
                    break;
                case 'missionResult':
                    break;
            }
        }
        else {
            console.log(message.type);
        }
    });
});

function createGameId() {
    return 'aaaa';
}