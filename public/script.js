const socket = io();

const joinForm = document.getElementById("joinForm");
const chatDiv = document.getElementById("chat");
const messagesDiv = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const usernameForm = document.getElementById("usernameForm");
const authError = document.getElementById("authError");

usernameForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) return;

  socket.emit("authenticate", { username, password });
});
socket.on("authSuccess", () => {
  document.getElementById("usernameModal").style.display = "none";
});

socket.on("authFailure", (msg) => {
  document.getElementById("authError").textContent = msg;
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
  div.innerHTML = `<strong>${msg.username}</strong> [${msg.time}]: ${msg.text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = document.getElementById("msg").value;
  socket.emit("chatMessage", msg);
  document.getElementById("msg").value = "";
});
