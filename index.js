var webSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');

var webSocketSeverPort = 1337;
var app = express();

var sessions = [];

app.use(express.static(__dirname));

app.listen(3000);

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
        if (message.type === 'utf8') {
            switch (message.messageType) {
                case 'newGame':
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
    });
});