// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);


app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('callWaiter', (data) => {
        console.log('Call waiter request received:', data);
        io.emit('callWaiter', data); // Broadcast to all clients
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));