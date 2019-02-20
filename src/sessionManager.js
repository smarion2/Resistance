var sessions = [];

exports.getSessionBySessionId = function (sessionId) {
    return sessions[sessionId];
}

exports.createNewSession = function (connection) {
    var sessionId = createSession(connection);
    return sessionId;
}

exports.resetWhoGoesOnMission = function (sessionId) {
    var session = sessions[sessionId];
    if (session) {
        for (var player in session.players) {
            if (session.players[player].isOnMission) {
                session.players[player].isOnMission = false;
            }
        }
    }
}

function createGameId() {
    return 'aaaa';
}

function createSession(server) {
    var sessionId = createGameId();
    sessions[sessionId] = {
        serverConnection: server,
        players: [],
        gameState: 'preGame',
        leaderToken: 0,
        roundNumber: 0,
        blueWins: 0,
        redWins: 0,
        missionVotes: 0,
        missionResults: 0,
        missionPasses: 0,
        missionFails: 0
    };
    return sessionId;
}