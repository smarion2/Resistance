var gameModel = function () {
    var sessionId = ko.observable();

    //if (ws === null) {
    var ws = new WebSocket('ws://localhost:1337', 'echo-protocol');
    //}

    ws.onmessage = function (message) {
        console.log(message.data);
    }
    this.createGame = function () {
        ws.send(JSON.stringify({ messageType: 'createGame' }));
        console.log("going to create a game now");
    };

    this.joinGame = function () {
        console.log("going to join a game now");
    };

};

ko.applyBindings(new gameModel());
