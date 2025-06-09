const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// In-memory data stores (in a real app, use a database)
const users = {}; // username -> { passwordHash, salt }
const rooms = new Set(['General', 'Random', 'Help']);
const activeUsers = new Map(); // socket.id -> { username, room }
const userSessions = new Map(); // username -> socket.id

// Secret for JWT (in production, use environment variable)
const JWT_SECRET = 'your-secret-key-here';

// Helper functions
function generateToken(username) {
    return jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

// Middleware to authenticate socket connections
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        return next(new Error('Authentication error'));
    }
    
    socket.username = decoded.username;
    next();
});

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username}`);
    
    // Add user to active users
    activeUsers.set(socket.id, { username: socket.username, room: null });
    userSessions.set(socket.username, socket.id);
    
    // Notify others about new user
    io.emit('userList', Array.from(userSessions.keys()));
    
    // Send initial room list
    socket.emit('roomList', Array.from(rooms));
    
    // Handle room joining
    socket.on('joinRoom', (roomName) => {
        if (!rooms.has(roomName)) {
            socket.emit('roomError', 'Room does not exist');
            return;
        }
        
        const userData = activeUsers.get(socket.id);
        if (userData.room) {
            // Leave previous room
            socket.leave(userData.room);
            io.to(userData.room).emit('systemMessage', {
                text: `${userData.username} has left the room.`
            });
        }
        
        // Join new room
        userData.room = roomName;
        activeUsers.set(socket.id, userData);
        socket.join(roomName);
        
        // Notify room
        io.to(roomName).emit('systemMessage', {
            text: `${userData.username} has joined the room.`
        });
        
        // Send updated user list to room
        updateRoomUsers(roomName);
    });
    
    // Handle room creation
    socket.on('createRoom', (roomName) => {
        if (rooms.has(roomName)) {
            socket.emit('roomError', 'Room already exists');
            return;
        }
        
        rooms.add(roomName);
        io.emit('roomList', Array.from(rooms));
        socket.emit('roomCreated', roomName);
    });
    
    // Handle leaving room
    socket.on('leaveRoom', (roomName) => {
        const userData = activeUsers.get(socket.id);
        if (userData.room === roomName) {
            socket.leave(roomName);
            userData.room = null;
            activeUsers.set(socket.id, userData);
            
            io.to(roomName).emit('systemMessage', {
                text: `${userData.username} has left the room.`
            });
            
            updateRoomUsers(roomName);
        }
    });
    
    // Handle messages
    socket.on('sendMessage', ({ room, text }) => {
        const userData = activeUsers.get(socket.id);
        if (!userData || userData.room !== room) {
            return;
        }
        
        // Basic message validation
        if (typeof text !== 'string' || text.trim() === '') {
            return;
        }
        
        // Sanitize message (in a real app, use a proper sanitizer)
        const sanitizedText = text.trim().substring(0, 500);
        
        io.to(room).emit('message', {
            username: userData.username,
            text: sanitizedText,
            time: new Date().toLocaleTimeString()
        });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        const userData = activeUsers.get(socket.id);
        if (userData) {
            if (userData.room) {
                io.to(userData.room).emit('systemMessage', {
                    text: `${userData.username} has disconnected.`
                });
                updateRoomUsers(userData.room);
            }
            
            activeUsers.delete(socket.id);
            userSessions.delete(userData.username);
            io.emit('userList', Array.from(userSessions.keys()));
        }
    });
    
    // Request handlers
    socket.on('getRooms', () => {
        socket.emit('roomList', Array.from(rooms));
    });
    
    socket.on('getUsers', () => {
        socket.emit('userList', Array.from(userSessions.keys()));
    });
});

// Update user list for a room
function updateRoomUsers(roomName) {
    const roomUsers = [];
    activeUsers.forEach((userData, socketId) => {
        if (userData.room === roomName) {
            roomUsers.push(userData.username);
        }
    });
    
    io.to(roomName).emit('roomUsers', roomUsers);
}

// Authentication routes
app.post('/register', express.json(), async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (users[username]) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        users[username] = { passwordHash: hash, salt };
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/login', express.json(), async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = users[username];
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    try {
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const token = generateToken(username);
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});