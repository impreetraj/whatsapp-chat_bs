require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const routes = require('./routes'); // Requires routes/index.js

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

// Inject socket.io into request for controllers to use
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Mount all unified routes
app.use('/', routes);

// Socket.io
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
