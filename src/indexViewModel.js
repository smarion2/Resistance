var gameModel = function () {
    var viewModel = {};
    viewModel.sessionId = ko.observable("");
    viewModel.ws;

    viewModel.createGame = function () {
        if (viewModel.ws == null) {
            viewModel.ws = new WebSocket("ws:localhost:1337", 'echo-protocol');
            wsListener();
        }
        while (viewModel.ws.readyState !== 1) {
            //         // set time out here?
        }
        viewModel.ws.send(JSON.stringify({ messageType: 'createGame' }));
        //console.log("going to create a game now");
    };

    viewModel.joinGame = function () {
        ws.send(JSON.stringify({
            messageType: 'joinGame',
            sessionId: 'aaaa',
            name: 'test'
        }))
        //console.log("going to join a game now");
    };


    function wsListener() {
        viewModel.ws.onmessage = function (message) {
            console.log(JSON.stringify(message.data));
            var parsedMessage = JSON.parse(message.data);
            for (var i in parsedMessage) {
                console.log(i);
            }
            switch (parsedMessage.messageType) {
                case 'createGame':
                    console.log(parsedMessage.sessionId);
                    registerSessionId(parsedMessage.sessionId);
                    break;
            }
        }
    }

    function registerSessionId(id) {
        this.sessionId(id);
    }
    return viewModel;
};

var model = gameModel;
ko.applyBindings(model);
