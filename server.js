const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { execSync } = require("child_process");
const users = {
  Disha: "childu@123",
  Sharath: "Rcb@123",
  Yashu: "admin123",
  Praveen: "Password"
};



console.log("Commit:", execSync("git rev-parse HEAD").toString().trim());

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));


const rooms = new Set();
io.on("connection", (socket) => {
  socket.on("authenticate", ({ username, password }) => {
    if (users[username] && users[username] === password) {
      socket.username = username;
      socket.emit("authSuccess");
      socket.emit("roomList", Array.from(rooms)); // optional
    } else {
      socket.emit("authFailure", "Invalid username or password");
    }
  });

  // only allow joining room after auth
  socket.on("joinRoom", (room) => {
    if (!socket.username) return;
    socket.join(room);
    // rest of your logic
  });

  // similar check for message sending
  socket.on("chatMessage", (msg) => {
    if (!socket.username) return;
    // continue handling message
  });

  // disconnect logic stays the same
});


io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.on("joinRoom", ({ username, room }) => {
    console.log(`User ${username} trying to join room ${room}`);

    // Log current users for debug
    console.log("Current users:", users);

    // Check if username is taken in ANY room
    const usernameTaken = Object.values(users).some(u => u.username === username);
    if (usernameTaken) {
      console.log(`Username taken: ${username}`);
      socket.emit("usernameTaken");
      return;
    }

    // Save user info
    users[socket.id] = { username, room };
    rooms.add(room);
    socket.join(room);

    console.log(`User joined: ${username} in room ${room}`);
    console.log("Users after join:", users);

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
    console.log(`Disconnecting: ${socket.id}`);

    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("message", {
        username: "System",
        text: `${user.username} left the room.`,
        time: new Date().toLocaleTimeString(),
      });

      delete users[socket.id];
      console.log(`User removed: ${user.username}`);
    } else {
      console.log(`No user info found for socket ${socket.id}`);
    }

    console.log("Users after disconnect:", users);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
