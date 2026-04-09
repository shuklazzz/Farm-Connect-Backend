const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Adjust in production to strictly allow client domain
            methods: ["GET", "POST", "PUT", "DELETE"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket.io] 🔌 Client connected: ${socket.id}`);

        // Farmer explicitly joins a private room based on their MongoDB ID
        socket.on('join_farmer_room', (farmerId) => {
            socket.join(`farmer_${farmerId}`);
            console.log(`[Socket.io] 👨‍🌾 Farmer ${farmerId} registered for live notifications.`);
        });

        socket.on('disconnect', () => {
            console.log(`[Socket.io] 🔌 Client disconnected: ${socket.id}`);
        });
    });
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io has not been initialized yet!");
    }
    return io;
};

module.exports = { initSocket, getIo };
