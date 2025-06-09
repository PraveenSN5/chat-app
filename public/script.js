const socket = io();

// DOM elements
const joinForm = document.getElementById("joinForm");
const chatDiv = document.getElementById("chat");
const messagesDiv = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const usernameForm = document.getElementById("usernameForm");
const authError = document.getElementById("authError");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");

// Track authentication state
let isAuthenticated = false;
let currentUsername = '';

// Registration handler
registerBtn?.addEventListener("click", function(e) {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword")?.value;

  if (!username || !password) {
    authError.textContent = "Username and password are required";
    return;
  }

  if (confirmPassword && password !== confirmPassword) {
    authError.textContent = "Passwords don't match";
    return;
  }

  socket.emit("register", { username, password });
});

// Login handler
loginBtn?.addEventListener("click", function(e) {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    authError.textContent = "Username and password are required";
    return;
  }

  socket.emit("login", { username, password });
});

// Authentication responses
socket.on("authSuccess", (username) => {
  isAuthenticated = true;
  currentUsername = username;
  document.getElementById("usernameModal").style.display = "none";
  // Show the room joining form after successful auth
  joinForm.style.display = "block";
});

socket.on("authFailure", (msg) => {
  authError.textContent = msg;
  isAuthenticated = false;
});

socket.on("registrationSuccess", () => {
  authError.textContent = "Registration successful! Please log in.";
  authError.style.color = "green";
});

socket.on("registrationError", (msg) => {
  authError.textContent = msg;
  authError.style.color = "red";
});

// Room joining - only allowed if authenticated
joinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  if (!isAuthenticated) {
    alert("Please authenticate first");
    return;
  }

  const room = document.getElementById("room").value.trim();

  if (!room) {
    alert("Room name is required");
    return;
  }

  socket.emit("joinRoom", { username: currentUsername, room });
});

// Message handling
socket.on("message", (msg) => {
  chatDiv.style.display = "block";
  joinForm.style.display = "none";

  const div = document.createElement("div");
  div.classList.add("message");

  if (msg.username === currentUsername) {
    div.classList.add("sent");
  } else if (msg.username === "System") {
    div.classList.add("system");
  } else {
    div.classList.add("received");
  }

  div.innerHTML = `
    <strong>${msg.username}</strong> [${msg.time}]: ${msg.text}
    <span class="time">${msg.time}</span>
  `;

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Chat message submission
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  if (!isAuthenticated) {
    alert("Please authenticate first");
    return;
  }

  const msgInput = document.getElementById("msg");
  const msg = msgInput.value.trim();
  
  if (!msg) return;
  
  socket.emit("chatMessage", {
    username: currentUsername,
    message: msg
  });
  
  msgInput.value = "";
});

// Handle disconnections
socket.on("disconnect", () => {
  if (isAuthenticated) {
    alert("You've been disconnected. Please refresh the page to reconnect.");
  }
});

// Handle session expiration
socket.on("sessionExpired", () => {
  isAuthenticated = false;
  alert("Your session has expired. Please log in again.");
  document.getElementById("usernameModal").style.display = "block";
});