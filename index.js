import {WebSocketServer} from 'ws';
import express from 'express';

const app = express();
const port = 3000
const wss = new WebSocketServer({port: 2000});
let state = {millis: 0}
let millisFlag = false
let clients = {}
const millisFunc = () => {
    if (millisFlag) {
        setTimeout(() => {
            state.millis++
            wss.clients.forEach(function each(ws) {
                if (ws.isAlive === false) return ws.terminate();
                ws.send(JSON.stringify(state));
            });
            // console.log(millis)
            millisFunc()
        }, 1000)
    }
}
millisFunc()
const startMillis = () => {
    millisFlag = true
    millisFunc()
}
const stopMillis = () => {
    millisFlag = false
}

const getClientsIps = () => {
    return Object.keys(clients).map(client =>
        clients[client]._socket.remoteAddress.toString().replace('::ffff:', '').replace(':ffff:', '')
    )
}

const notifyClientsUpdateClientsIps = () => {
    const event = {
        event: 'clientsIp',
        data: getClientsIps()
    }
    // console.log(event)
    // ws.send(getClientsIps())
    wss.clients.forEach(client => client.send(JSON.stringify(event)))
}

const sendWebsocketMessageFromTo = (destination, obj) => {
    let toUserWebSocket = clients[destination]
    if (toUserWebSocket) {
        // console.log('sent to ' + destination + ': ' + JSON.stringify(obj)) //sent to
        // messageObj.data.from = clientIp
        toUserWebSocket.send(JSON.stringify(obj))
    }
}

wss.on('connection', function connection(ws, req) {
    let clientIp = req.socket.remoteAddress.toString().replace('::ffff:', '').replace(':ffff:', '')
    // console.log(clientIp)
    // clientIp = clientIp.replace('::ffff:', '').replace(':ffff:', '')
    clients[clientIp] = ws
    console.log('connected: ' + clientIp)

    ws.send(JSON.stringify({event: 'getIp', data: {ip: clientIp}}))
    notifyClientsUpdateClientsIps()


    ws.on('error', console.error);
    ws.on('message', function (data) {
        // console.log('received from ' + clientIp + ': ' + data) //received from
        let messageObj = JSON.parse(data)

        switch (messageObj.event) {
            case 'message': {
                sendWebsocketMessageFromTo(messageObj.data.to.ip, messageObj);
                break
            }
            case 'distanceCheckRequest': {
                sendWebsocketMessageFromTo(messageObj.data.to.ip, messageObj)
                break
            }

            case 'distanceCheckResponse': {
                sendWebsocketMessageFromTo(messageObj.data.to.ip, messageObj)
                break
            }
        }
    });

    ws.on('close', function () {
        delete clients[clientIp]
        notifyClientsUpdateClientsIps()
        console.log('deleted: ' + clientIp)
    })
});
app.get('/', function (request, response) {
    response.sendFile("index.html", {root: '.'});
});
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

import os from 'os'
console.log(os.networkInterfaces());