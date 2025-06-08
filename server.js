const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const users = {}; // socket.id => { username, room }
const rooms = new Set();

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const usernameTaken = Object.values(users).some(
      (u) => u.username === username
    );
    if (usernameTaken) {
      socket.emit("usernameTaken");
      return;
    }

    users[socket.id] = { username, room };
    rooms.add(room);
    socket.join(room);

    io.to(room).emit("message", {
      username: "System",
      text: `${username} joined the room.`,
      time: new Date().toLocaleTimeString(),
    });
  });

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

const PORT = process.env.PORT || 3000; // fallback for local testing
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
