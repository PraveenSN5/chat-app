const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { execSync } = require("child_process");

// Store users with password authentication
const registeredUsers = {
  Disha: "childu@123",
  Sharath: "Rcb@123",
  Yashu: "admin123",
  Praveen: "Password"
};

// Track active users and rooms
const activeUsers = new Map(); // socket.id -> { username, room }
const rooms = new Set();

console.log("Commit:", execSync("git rev-parse HEAD").toString().trim());

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Authentication handler
  socket.on("authenticate", ({ username, password }) => {
    if (!registeredUsers[username] || registeredUsers[username] !== password) {
      socket.emit("authFailure", "Invalid username or password");
      return;
    }

    // Check if user is already logged in elsewhere
    for (let [_, user] of activeUsers) {
      if (user.username === username) {
        socket.emit("authFailure", "User already logged in");
        return;
      }
    }

    socket.emit("authSuccess", username);
  });

  socket.on("joinRoom", ({ username, room }) => {
    // Validate input
    if (!username || !room || typeof username !== 'string' || typeof room !== 'string') {
      socket.emit("error", "Invalid username or room");
      return;
    }

    // Check if username is taken in this room
    for (let [_, user] of activeUsers) {
      if (user.username === username && user.room === room) {
        socket.emit("usernameTaken");
        return;
      }
    }

    // Join the room
    activeUsers.set(socket.id, { username, room });
    rooms.add(room);
    socket.join(room);

    // Notify room
    io.to(room).emit("message", {
      username: "System",
      text: `${username} joined the room.`,
      time: new Date().toLocaleTimeString(),
    });
  });

  socket.on("chatMessage", (msg) => {
    const user = activeUsers.get(socket.id);
    if (!user) {
      socket.emit("error", "Not authenticated");
      return;
    }

    // Basic message validation
    if (typeof msg !== 'string' || msg.trim() === '') {
      socket.emit("error", "Invalid message");
      return;
    }

    // Sanitize message (in a real app, use a proper sanitizer)
    const sanitizedMsg = msg.trim().substring(0, 500);

    io.to(user.room).emit("message", {
      username: user.username,
      text: sanitizedMsg,
      time: new Date().toLocaleTimeString(),
    });
  });

  socket.on("disconnect", () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        username: "System",
        text: `${user.username} left the room.`,
        time: new Date().toLocaleTimeString(),
      });
      activeUsers.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});