const socket = io();
const loginModal = document.getElementById("loginModal");
const joinBtn = document.getElementById("joinBtn");
const chatContainer = document.getElementById("chatContainer");
const messages = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const errorMsg = document.getElementById("errorMsg");

let username = "";
let room = "";

joinBtn.onclick = () => {
  username = document.getElementById("username").value.trim();
  room = document.getElementById("room").value.trim();

  if (!username || !room) return (errorMsg.innerText = "Both fields required!");

  socket.emit("joinRoom", { username, room });
};

socket.on("usernameTaken", () => {
  errorMsg.innerText = "Username already taken!";
});

socket.on("message", (data) => {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.innerHTML = `<strong>${data.username}</strong> [${data.time}]: ${data.text}`;
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
});

chatForm.onsubmit = (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (msg !== "") socket.emit("chatMessage", msg);
  messageInput.value = "";
};

socket.on("connect", () => {
  socket.on("message", (data) => {
    if (loginModal && !chatContainer.classList.contains("hidden")) {
      loginModal.classList.add("hidden");
      chatContainer.classList.remove("hidden");
    }
  });
});
