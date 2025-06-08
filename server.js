const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { execSync } = require("child_process");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Static users with passwords
const registeredUsers = {
  Disha: "childu@123",
  Sharath: "Rcb@123",
  Yashu: "admin123",
  Praveen: "Password"
};

console.log("Commit:", execSync("git rev-parse HEAD").toString().trim());

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Set(); // Set of all room names
const activeUsers = {};  // socket.id -> { username, room }

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.authenticated = false;

  // Step 1: Authentication
  socket.on("authenticate", ({ username, password }) => {
    if (registeredUsers[username] && registeredUsers[username] === password) {
      socket.username = username;
      socket.authenticated = true;
      socket.emit("authSuccess");
      socket.emit("roomList", Array.from(rooms));
      console.log(`${username} authenticated`);
    } else {
      socket.emit("authFailure", "❌ Invalid username or password");
    }
  });

  // Step 2: Join Room
  socket.on("joinRoom", (room) => {
    if (!socket.authenticated) {
      socket.emit("authFailure", "❌ Please login first");
      return;
    }

    rooms.add(room);
    socket.join(room);
    activeUsers[socket.id] = { username: socket.username, room };

    io.to(room).emit("message", {
      username: "System",
      text: `${socket.username} joined the room.`,
      time: new Date().toLocaleTimeString(),
    });

    console.log(`${socket.username} joined room ${room}`);
  });

  // Step 3: Send Chat Message
  socket.on("chatMessage", (msg) => {
    const user = activeUsers[socket.id];
    if (!socket.authenticated || !user) {
      socket.emit("authFailure", "❌ Unauthorized message attempt");
      return;
    }

    io.to(user.room).emit("message", {
      username: user.username,
      text: msg,
      time: new Date().toLocaleTimeString(),
    });
  });

  // Step 4: Disconnect
  socket.on("disconnect", () => {
    const user = activeUsers[socket.id];
    if (user) {
      io.to(user.room).emit("message", {
        username: "System",
        text: `${user.username} left the room.`,
        time: new Date().toLocaleTimeString(),
      });

      delete activeUsers[socket.id];
      console.log(`${user.username} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
