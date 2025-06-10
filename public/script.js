const socket = io();

const joinForm = document.getElementById("joinForm");
const chatDiv = document.getElementById("chat");
const messagesDiv = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const usernameForm = document.getElementById("usernameForm");
const authError = document.getElementById("authError");
const createRoomForm = document.getElementById("createRoomForm");
const newRoomInput = document.getElementById("newRoom");

const roomListSelect = document.getElementById("roomList");

joinBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !room || !password) {
    alert('Please enter all fields.');
    return;
  }

  // Save globally for reuse
  window.currentUser = { username, room };

  socket.emit("authenticate", { username, password });
});

socket.on("authSuccess", () => {
  const { username, room } = window.currentUser;

  socket.emit("joinRoom", { username, room });
});

socket.on("authFailure", (msg) => {
  alert(msg);
});

joinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const room = document.getElementById("room").value.trim();

  socket.emit("joinRoom", { username, room });
});

socket.on("usernameTaken", () => {
  alert("Username is already taken in this room!");
});

socket.on("message", (msg) => {
  chatDiv.style.display = "block";
  joinForm.style.display = "none";

  const div = document.createElement("div");
  div.classList.add("message");

  const currentUser = document.getElementById("username").value.trim();
  if (msg.username === "System") {
    div.classList.add("system");
  } else if (msg.username === currentUser) {
    div.classList.add("sent");
  } else {
    div.classList.add("received");
  }

  div.innerHTML = `<strong>${msg.username}</strong> [${msg.time}]: ${msg.text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});


chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msgInput = document.getElementById("msg");
  const msg = msgInput.value.trim();
  if (!msg) return;
  socket.emit("chatMessage", msg);
  msgInput.value = "";
});

// Request list of rooms when page loads
socket.emit("getRooms");

// Populate room dropdown on receiving list
socket.on("roomList", (rooms) => {
  console.log("Received rooms from server:", rooms); 
  roomListSelect.innerHTML = '<option value="">Select a room</option>';
  rooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = room;
    roomListSelect.appendChild(option);
  });
});

// Handle room creation
createRoomForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const room = newRoomInput.value.trim();
  const username = document.getElementById("username").value.trim();
  if (!room || !username) return;
  socket.emit("createRoom", { room, username });
});

// Room already exists
socket.on("roomExists", (room) => {
  alert(`Room "${room}" already exists. Please join it instead.`);
});

// Room successfully created
socket.on("roomCreated", (room) => {
  alert(`Room "${room}" created and joined.`);
  document.getElementById("room").value = room;
  socket.emit("getRooms"); // auto-fill room for chat
  joinForm.requestSubmit(); // auto-submit join form
});

// Room not found on join attempt
socket.on("roomNotFound", (room) => {
  alert(`Room "${room}" not found.`);
});

// Joined existing room
socket.on("roomJoined", (room) => {
  joinChatDiv.style.display = "none";
  chatContainer.style.display = "flex";
  alert(`Successfully joined room: ${room}`);
});

roomListSelect.addEventListener("change", () => {
  document.getElementById("room").value = roomListSelect.value;
});


