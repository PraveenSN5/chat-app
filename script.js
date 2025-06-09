document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authModal = document.getElementById('authModal');
    const appContainer = document.getElementById('appContainer');
    const authForm = document.getElementById('authForm');
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const registerFields = document.getElementById('registerFields');
    const authSubmit = document.getElementById('authSubmit');
    const authError = document.getElementById('authError');
    const roomModal = document.getElementById('roomModal');
    const roomForm = document.getElementById('roomForm');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const cancelRoomBtn = document.getElementById('cancelRoomBtn');
    const roomList = document.getElementById('roomList');
    const userList = document.getElementById('userList');
    const messagesContainer = document.getElementById('messagesContainer');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    const currentRoomDisplay = document.getElementById('currentRoom');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const formattingTools = document.querySelectorAll('.formatting-tools button');
    
    // App State
    let currentUser = null;
    let currentRoom = null;
    let socket = null;
    
    // Initialize Socket.io connection
    function initSocket() {
        socket = io();
        
        // Authentication responses
        socket.on('authSuccess', (username) => {
            currentUser = username;
            usernameDisplay.textContent = username;
            userAvatar.textContent = username.charAt(0).toUpperCase();
            authModal.style.display = 'none';
            appContainer.style.display = 'flex';
            loadInitialData();
        });
        
        socket.on('authFailure', (message) => {
            authError.textContent = message;
            authError.style.color = 'var(--danger-color)';
        });
        
        socket.on('registrationSuccess', () => {
            authError.textContent = 'Registration successful! Please login.';
            authError.style.color = 'var(--success-color)';
            switchToLogin();
        });
        
        socket.on('registrationError', (message) => {
            authError.textContent = message;
            authError.style.color = 'var(--danger-color)';
        });
        
        // Room management
        socket.on('roomList', (rooms) => {
            roomList.innerHTML = '';
            rooms.forEach(room => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-comments"></i> ${room}`;
                li.addEventListener('click', () => joinRoom(room));
                roomList.appendChild(li);
            });
        });
        
        socket.on('userList', (users) => {
            userList.innerHTML = '';
            users.forEach(user => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-user"></i> ${user}`;
                userList.appendChild(li);
            });
        });
        
        socket.on('roomCreated', (room) => {
            roomModal.style.display = 'none';
            joinRoom(room);
        });
        
        socket.on('roomError', (message) => {
            alert(message);
        });
        
        // Messaging
        socket.on('message', (message) => {
            displayMessage(message);
        });
        
        socket.on('systemMessage', (message) => {
            displaySystemMessage(message);
        });
        
        socket.on('disconnect', () => {
            alert('You have been disconnected. Please refresh the page.');
        });
    }
    
    // Load initial data after authentication
    function loadInitialData() {
        socket.emit('getRooms');
        socket.emit('getUsers');
    }
    
    // Join a room
    function joinRoom(room) {
        if (currentRoom === room) return;
        
        currentRoom = room;
        currentRoomDisplay.textContent = room;
        messagesContainer.innerHTML = '';
        
        // Highlight selected room
        Array.from(roomList.children).forEach(li => {
            li.classList.remove('active');
            if (li.textContent.includes(room)) {
                li.classList.add('active');
            }
        });
        
        socket.emit('joinRoom', room);
    }
    
    // Leave current room
    function leaveRoom() {
        if (!currentRoom) return;
        
        socket.emit('leaveRoom', currentRoom);
        currentRoom = null;
        currentRoomDisplay.textContent = 'Select a Room';
        messagesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <p>Join a room to start chatting</p>
            </div>
        `;
        
        // Remove active class from all rooms
        Array.from(roomList.children).forEach(li => {
            li.classList.remove('active');
        });
    }
    
    // Display a chat message
    function displayMessage(message) {
        const emptyState = messagesContainer.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.username === currentUser ? 'sent' : 'received'}`;
        
        const formattedText = formatMessageText(message.text);
        
        messageDiv.innerHTML = `
            <div class="message-info">
                <span class="message-sender">${message.username}</span>
                <span class="message-time">${message.time}</span>
            </div>
            <div class="message-content">${formattedText}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Display system message
    function displaySystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.innerHTML = `
            <div class="message-content">${message.text}</div>
        `;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Format message text (bold, italics, links)
    function formatMessageText(text) {
        // Simple formatting - in a real app you'd want more robust parsing
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<span class="bold">$1</span>')
            .replace(/\*(.*?)\*/g, '<span class="italic">$1</span>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="link">$1</a>');
        
        return formatted;
    }
    
    // Switch to login tab
    function switchToLogin() {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        registerFields.style.display = 'none';
        authSubmit.textContent = 'Login';
    }
    
    // Switch to register tab
    function switchToRegister() {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerFields.style.display = 'block';
        authSubmit.textContent = 'Register';
    }
    
    // Initialize event listeners
    function initEventListeners() {
        // Auth form tabs
        loginTab.addEventListener('click', switchToLogin);
        registerTab.addEventListener('click', switchToRegister);
        
        // Auth form submission
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('authUsername').value.trim();
            const password = document.getElementById('authPassword').value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;
            
            if (registerFields.style.display === 'block') {
                // Registration
                if (password !== confirmPassword) {
                    authError.textContent = 'Passwords do not match';
                    authError.style.color = 'var(--danger-color)';
                    return;
                }
                socket.emit('register', { username, password });
            } else {
                // Login
                socket.emit('login', { username, password });
            }
        });
        
        // Room creation
        createRoomBtn.addEventListener('click', () => {
            roomModal.style.display = 'flex';
        });
        
        cancelRoomBtn.addEventListener('click', () => {
            roomModal.style.display = 'none';
        });
        
        roomForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const roomName = document.getElementById('roomName').value.trim();
            if (roomName) {
                socket.emit('createRoom', roomName);
            }
        });
        
        // Message submission
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = messageInput.value.trim();
            if (message && currentRoom) {
                socket.emit('sendMessage', {
                    room: currentRoom,
                    text: message
                });
                messageInput.value = '';
            }
        });
        
        // Leave room
        leaveRoomBtn.addEventListener('click', leaveRoom);
        
        // Formatting tools
        formattingTools.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const format = button.getAttribute('data-format');
                const start = messageInput.selectionStart;
                const end = messageInput.selectionEnd;
                const text = messageInput.value;
                let before, selected, after;
                
                before = text.substring(0, start);
                selected = text.substring(start, end);
                after = text.substring(end);
                
                switch(format) {
                    case 'bold':
                        messageInput.value = before + '**' + selected + '**' + after;
                        break;
                    case 'italic':
                        messageInput.value = before + '*' + selected + '*' + after;
                        break;
                    case 'link':
                        messageInput.value = before + '[' + selected + '](url)' + after;
                        break;
                }
                
                // Restore cursor position
                messageInput.focus();
                messageInput.setSelectionRange(start + 2, end + 2);
            });
        });
    }
    
    // Initialize the app
    initSocket();
    initEventListeners();
});