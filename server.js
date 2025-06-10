const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { execSync } = require("child_process");

// Predefined login users
const authUsers = {
  Disha: "childu@123",
  Sharath: "Rcb@123",
  Yashu: "admin123",
  Praveen: "Password"
};

const users = {}; // Will hold: socket.id => { username, room }
const rooms = new Set(); // Global room store

console.log("Commit:", execSync("git rev-parse HEAD").toString().trim());

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  // --- Authentication ---
  socket.on("authenticate", ({ username, password }) => {
    if (authUsers[username] && authUsers[username] === password) {
      socket.emit("authSuccess");
    } else {
      socket.emit("authFailure", "Invalid username or password");
    }
  });

  // --- Room list fetch ---
  socket.on("getRooms", () => {
    socket.emit("roomList", Array.from(rooms));
  });

  // --- Room creation ---
  socket.on("createRoom", ({ room, username }) => {
    console.log(`Creating room: ${room} by ${username}`);

    if (rooms.has(room)) {
      socket.emit("roomExists", room);
    } else {
      rooms.add(room);
      console.log("Rooms Set:", Array.from(rooms));
      io.emit("roomList", Array.from(rooms));

      socket.join(room);
      users[socket.id] = { username, room };
      socket.emit("roomCreated", room);

      io.to(room).emit("message", {
        username: "System",
        text: `${username} created and joined the room.`,
        time: new Date().toLocaleTimeString(),
      });
    }
  });

  // --- Join room ---
  socket.on("joinRoom", ({ room, username }) => {
    
    if (!rooms.has(room)) {
      socket.emit("roomNotFound", room);
    } else {
      // Check if username already taken in the room
      const taken = Object.values(users).some(
        (u) => u.username === username && u.room === room
      );

      if (taken) {
        socket.emit("usernameTaken");
        return;
      }

      socket.join(room);
      users[socket.id] = { username, room };
      socket.emit("roomJoined", room);

      io.to(room).emit("message", {
        username: "System",
        text: `${username} joined the room.`,
        time: new Date().toLocaleTimeString(),
      });
    }
  });

  // --- Handle messages ---
  socket.on("chatMessage", (msg) => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("message", {
        username: user.username,
        text: msg,
        time: new Date().toLocaleTimeString(),
      });
    }
  });

  // --- Handle disconnect ---
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("message", {
        username: "System",
        text: `${user.username} left the room.`,
        time: new Date().toLocaleTimeString(),
      });

      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
