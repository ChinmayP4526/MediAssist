document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.getElementById("chatContainer");
    const input = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendBtn");
    const newChatBtn = document.querySelector(".new-btn");
    const logoutBtn = document.getElementById("logoutBtn");
    const chatList = document.getElementById("savedChats");
    const searchInput = document.getElementById("SearchChat");

    let currentChatId = null;
    let chats = loadChats();

    function generateChatId() {
        return 'chat-' + Date.now();
    }

    function loadChats() {
        const saved = localStorage.getItem('userChats');
        return saved ? JSON.parse(saved) : {};
    }

    function saveChats() {
        localStorage.setItem('userChats', JSON.stringify(chats));
    }

    function renderChats(filter = "") {
        chatList.innerHTML = '';

        Object.keys(chats).forEach(chatId => {
            const firstMsg = chats[chatId][0]?.content || "New Chat";
            const name = firstMsg.length > 25 ? firstMsg.slice(0, 25) + "..." : firstMsg;

            if (name.toLowerCase().includes(filter.toLowerCase())) {
                const wrapper = document.createElement("div");
                wrapper.className = "chat-entry-wrapper";

                const div = document.createElement("div");
                div.className = "chat-entry";
                div.textContent = name;
                div.addEventListener("click", () => {
                    currentChatId = chatId;
                    loadMessages(chatId);
                });

                const menuIcon = document.createElement("span");
                menuIcon.className = "menu-icon";
                menuIcon.innerHTML = "&#8942;"; // Vertical 3 dots

                const dropdown = document.createElement("div");
                dropdown.className = "dropdown-menu";
                dropdown.style.display = "none";

                const editOption = document.createElement("div");
                editOption.textContent = "Edit";
                editOption.className = "dropdown-item";
                editOption.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const newName = prompt("Rename chat:", name);
                    if (newName) {
                        chats[chatId][0] = { ...chats[chatId][0], content: newName };
                        saveChats();
                        renderChats(searchInput.value);
                    }
                });

                const deleteOption = document.createElement("div");
                deleteOption.textContent = "Delete";
                deleteOption.className = "dropdown-item";
                deleteOption.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this chat?")) {
                        delete chats[chatId];
                        if (currentChatId === chatId) {
                            currentChatId = Object.keys(chats)[0] || null;
                            loadMessages(currentChatId);
                        }
                        saveChats();
                        renderChats(searchInput.value);
                    }
                });

                dropdown.appendChild(editOption);
                dropdown.appendChild(deleteOption);

                menuIcon.addEventListener("click", (e) => {
                    e.stopPropagation();
                    document.querySelectorAll(".dropdown-menu").forEach(menu => {
                        if (menu !== dropdown) menu.style.display = "none";
                    });
                    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
                });

                document.addEventListener("click", () => {
                    dropdown.style.display = "none";
                });

                wrapper.appendChild(div);
                wrapper.appendChild(menuIcon);
                wrapper.appendChild(dropdown);
                chatList.appendChild(wrapper);
            }
        });
    }

    function loadMessages(chatId) {
        chatContainer.innerHTML = '';
        const messages = chats[chatId] || [];

        messages.forEach(msg => {
            const div = document.createElement("div");
            div.className = `chat-message ${msg.sender}`;
            div.textContent = msg.content;
            chatContainer.appendChild(div);
        });

        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async function sendMessage() {
        const message = input.value.trim();
        if (!message || !currentChatId) return;

        const userMsg = { sender: 'user', content: message };
        chats[currentChatId].push(userMsg);
        loadMessages(currentChatId);
        input.value = '';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();
            const botText = data.reply || "Sorry, I couldn't understand that.";

            const botMsg = { sender: 'bot', content: botText };
            chats[currentChatId].push(botMsg);
            saveChats();
            loadMessages(currentChatId);
            renderChats(searchInput.value);
        } catch (error) {
            const errorMsg = { sender: 'bot', content: "Error contacting server." };
            chats[currentChatId].push(errorMsg);
            loadMessages(currentChatId);
        }
    }

    function newChat() {
        const newId = generateChatId();
        chats[newId] = [];
        currentChatId = newId;
        saveChats();
        loadMessages(currentChatId);
        renderChats(searchInput.value);
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    newChatBtn.addEventListener("click", newChat);

    logoutBtn.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "/login";
    });

    searchInput.addEventListener("input", () => {
        renderChats(searchInput.value);
    });

    // On load
    if (Object.keys(chats).length === 0) {
        newChat();
    } else {
        currentChatId = Object.keys(chats)[0];
        loadMessages(currentChatId);
        renderChats();
    }
});
document.getElementById('language-select').addEventListener('change', function () {
  const lang = this.value;
  applyTranslations(lang);
});

function applyTranslations(lang) {
  const t = translations[lang];
  document.getElementById('title-text').textContent = t.title;
  document.getElementById('welcome-message').textContent = t.welcome;
  document.getElementById('conversation-title').textContent = t.conversation;
  document.getElementById('search-input').placeholder = t.search;
  document.getElementById('chatInput').placeholder = t.describe;
  document.getElementById('new-chat-btn').textContent = t.newChat;
}
window.onload = () => {
  displaySavedChats();
  setupSendHandler();
  applyTranslations('en'); // Default language
};