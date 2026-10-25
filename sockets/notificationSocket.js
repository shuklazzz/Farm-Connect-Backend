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

        // Buyer joins tracking room for an order
        socket.on('join_tracking_room', (orderId) => {
            socket.join(`tracking_${orderId}`);
            console.log(`[Socket.io] 🚚 Buyer joined tracking room for order ${orderId}`);
        });

        // Farmer sends location update
        socket.on('farmer_location_update', (data) => {
            // data should contain { orderId, location: { lat, lng } }
            if (data.orderId && data.location) {
                // Broadcast to anyone in the tracking room for this order
                io.to(`tracking_${data.orderId}`).emit('delivery_location_update', data.location);
                console.log(`[Socket.io] 📍 Location update for order ${data.orderId}: ${data.location.lat}, ${data.location.lng}`);
            }
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
