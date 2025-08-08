const token = localStorage.getItem('authToken');
let lastMessageDate = null;

async function get_user() {
    try {
        const response = await fetch('/api/users/me/', {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
            },
        });

        if (response.status === 200) {
            const data = await response.json();
            return data
        } else {
            return null;
        }
    } catch (error) {
        console.error("Ошибка при получении ID пользователя:", error);
        return null;
    }
}

function formatTime(isoString) {
    const date = new Date(isoString); // Парсит ISO-дату
    const hours = date.getHours().toString().padStart(2, '0'); // добавляет 0 спереди
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function showNotification(type, message) {
    const notifications = document.querySelector(".notifications");
    const toast = document.createElement("li");

    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="column">
            <i style="font-size: 1.5em; margin-right: 10px;">
                ${type === 'success' ? '✓' : '✗'}
            </i>
            <span>${message}</span>
        </div>
        <i style="font-size: 1.5em; cursor: pointer;" onclick="removeToast(this.parentElement)">×</i>
    `;

    notifications.appendChild(toast);

    const timeoutId = setTimeout(() => {
        removeToast(toast);
    }, 5000);

    toast.timeoutId = timeoutId;
}

function removeToast(toast) {
    toast.classList.add("hide");
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    setTimeout(() => toast.remove(), 500);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long' }; // например, "6 августа"
    return date.toLocaleDateString('ru-RU', options);
}

function renderMessage({ author, text, created_at, author_avatar }, user, isCurrentUser) {
    const time = formatTime(created_at);
    const avatar = isCurrentUser ? user.avatar : author_avatar;

    const currentDate = new Date(created_at).toDateString();
    let html = '';

    if (lastMessageDate !== currentDate) {
        const formattedDate = formatDate(created_at);
        html += `
            <div class="date-label">
                <span>${formattedDate}</span>
            </div>
        `;
        lastMessageDate = currentDate;
    }

    if (isCurrentUser) {
        html += `
            <div class="outgoing-chats">
                <div class="outgoing-chats-img">
                    <img src="${avatar}">
                </div>
                <div class="outgoing-chats-msg">
                    <p>${text}</p>
                    <span class="time">${time}</span>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="received-chats">
                <div class="received-chats-img">
                    <img src="${avatar}">
                </div>
                <div class="received-msg-inbox">
                    <p>${text}</p>
                    <span class="time">${time}</span>
                </div>
            </div>
        `;
    }
    msgPage.insertAdjacentHTML("beforeend", html);
}

async function showProfile(user, mode) {
     const response = await fetch(`/api/users/${user.id}/profile/`, {
       method: 'GET',
       headers: {
            'Authorization': `Token ${token}`
       }
    });
    const obj = await response.json();

    document.querySelector('.profile-modal__title').innerHTML = mode ? `Профиль` : `Настройки профиля`;
    document.getElementById("profileMainUsername").innerHTML = `${obj.username}`
    const online = document.querySelector('.profile-modal__status-online');
    const offline = document.querySelector('.profile-modal__status-offline');


    avatarInput.disabled = mode;
    avatarImg.src = obj.avatar;
    avatarImg.style.cursor = mode ? 'default': 'pointer';

    if (obj.is_online) {
        online.style.display = 'inline';
        offline.style.display = 'none';
    } else {
        online.style.display = 'none';
        offline.style.display = 'inline';
    }

    profileUsername.readOnly = mode;
    profileUsername.value = obj.username;

    profileFirstName.readOnly = mode;
    profileFirstName.value = obj.first_name;

    profileLastName.readOnly = mode;
    profileLastName.value = obj.last_name;

    profileBio.readOnly = mode;
    profileBio.value = obj.bio;

    logoutBtn.style.display = mode ? 'none' : 'flex';
    saveProfile.style.display = mode ? 'none' : 'flex';
    startChat.style.display = mode ? 'flex' : 'none';
    startChat.dataset.userId = mode ? obj.id : '';
}

// Функция для рендеринга пользователей
function renderUsers(users, current_user) {
    searchUsersList.innerHTML = ''; // очистка перед рендерингом

    if (users.length === 0) {
        searchUsersList.innerHTML = '<div class="search-modal__user">Ничего не найдено</div>';
        return;
    }

    users.forEach(search_user => {
        if (search_user.username === current_user.username) return; // пропустить текущего

        const userHTML = `
            <div class="search-modal__user" data-id=${search_user.id}>
                <img src="${search_user.avatar}" class="search-modal__avatar-img" alt="Аватар">
                <span class="search-modal__username">${search_user.username}</span>
            </div>
        `;
        searchUsersList.insertAdjacentHTML("beforeend", userHTML);
    });
};

function renderChats(chat, userId) {
    const chatId = chat.id;
    const isGroup = chat.is_group;
    let companionId = null;
    if (!isGroup) {
        companionId = chat.members[0] == userId ? chat.members[1] : chat.members[0];
    } else {
        companionId = chat.members;
    }
    const chatAvatar = chat.display_photo;
    const title = chat.display_name;
    const lastMessage = chat.last_message;
    const messageTime = chat.display_time ? formatTime(chat.display_time): '';

    const chatHTML =
        `<div class="chat-item" data-id=${chatId} data-title=${title} data-avatar=${chatAvatar} data-companion-id=${companionId}>
            <img src="${chatAvatar}" class="chat-avatar">
            <div class="chat-info">
                <span class="chat-name">${title}</span>
                <span class="last-message">${lastMessage}</span>
            </div>
            <span class="message-time">${messageTime}</span>
        </div>`
    ;
    chatsList.insertAdjacentHTML("beforeend", chatHTML);
};

document.addEventListener('DOMContentLoaded', async function () {
    // Пользователь
    const user = await get_user();
    let userId = null

    // Модальные
    const modalOverlay = document.getElementById('modalOverlay');
    const authModal = document.querySelector('.auth-modal');
    const regModal = document.querySelector('.reg-modal');

    // Чат
    const chatApp = document.querySelector('.chat-app');
    const chatsList = document.getElementById("chatsList");
    const msgPage = document.getElementById("msgPage");
    const inputMessage = document.querySelector('.chat-message-input');
    const messageSubmit = document.querySelector('.chat-message-submit');

    // Профиль
    const avatarImg = document.getElementById("avatarImg");
    const profileModal = document.querySelector('.profile-modal')
    const avatarInput = document.getElementById("avatarInput");
    const profileUsername = document.getElementById("profileUsername")
    const profileFirstName =  document.getElementById("profileFirstName");
    const profileLastName =  document.getElementById("profileLastName");
    const profileBio =  document.getElementById("profileBio");
    const saveProfile = document.getElementById("saveProfile");
    const logoutBtn = document.getElementById("logoutBtn");
    const startChat = document.getElementById("startChat");

    // Меню
    const menuModal = document.querySelector('.menu-modal');
    const searchModal = document.getElementById('searchModal');
    const searchModalOverlay = document.getElementById('searchModalOverlay');

    // Поиск пользователей
    const searchUsersList = document.getElementById('searchUsersList');
    const searchInput = document.querySelector('.search-modal__input');
    let allUsers = [];

    // Поиск чата
    const searchChat = document.querySelector('.search-input');

    // Проверка авторизации
    async function checkAuth() {
        if (!user) {
            authModal.style.display = 'flex';
            modalOverlay.style.display = 'flex';
            chatApp.style.display = 'none';
        } else {
            userId = user.id
            avatarImg.src = user.avatar;
        }
    }

    checkAuth();

    // Авторизация
    document.getElementById('authBtn').addEventListener('click', async () => {
        const username = document.querySelector('#username_auth').value;
        const password = document.querySelector('#password_auth').value;
        const errorAuth = document.getElementById("errorAuth");

        const response = await fetch(`/api/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            userData = await response.json()
            localStorage.setItem('authToken', userData.token);
            authModal.style.display = 'none';
            modalOverlay.style.display = 'none';
            chatApp.style.display = 'flex';
            window.location.reload();
        } else {
            errorAuth.textContent = 'Вы ввели неверный логин или пароль!';
            errorAuth.style.display = 'block';
        }
    });

    // Регистрация пользователя
    document.getElementById('regBtn').addEventListener('click', async () => {
        const errorDiv = document.getElementById('reg-error');
        const username = document.querySelector('#username_reg').value;
        const password = document.querySelector('#password_reg').value;
        const second_password = document.querySelector('#second_password_reg').value;

        if (password !== second_password) {
            errorDiv.textContent = 'Пароли не совпадают!';
            errorDiv.style.display = 'block';
            return;
        }

        const response = await fetch(`/api/users/`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({username, password})
        })

        if (response.ok) {
            window.location.reload();
        } else {
            const data = await response.json();
            if (data.password) {
                errorDiv.textContent = data.password[0];
                errorDiv.style.display = 'block';
            } else if (data.non_field_errors) {
                errorDiv.textContent = data.non_field_errors[0];
                errorDiv.style.display = 'block';
            } else if (data.username) {
                errorDiv.textContent = data.username[0];
                errorDiv.style.display = 'block';
            } else {
                errorDiv.textContent = 'Ошибка регистрации';
                errorDiv.style.display = 'block';
            }
        }
    });

    // Обработка выхода из аккаунта
    logoutBtn.addEventListener('click', async ()=> {
        const response = await fetch(`/api/logout/`, {
            method: "POST",
            headers: {
                'Authorization': `Token ${token}`,
            }
        });

        if (response.ok) {
            localStorage.removeItem('authToken');
            window.location.reload();
        } else {
            showNotification('error', "Ошибка выхода!");
        }
    });

    // Обработка модальных окон регистрации
    document.getElementById('openRegBtn').addEventListener('click', () => {
        authModal.style.display = 'none';
        regModal.style.display = 'flex';
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        regModal.style.display = 'none';
        authModal.style.display = 'flex';
    });

    // ЧАТ
    // Загрузка чатов
    const response = await fetch("/api/chats/", {
        method: 'GET',
        headers: {
            'Authorization': `Token ${token}`,
        }
    });

    if (!response.ok) {
        console.log('error', "Ошибка загрузки чата!");
    }

    const chats = await response.json();
    chatsList.innerHTML = "";

    // Загрузка чатов из базы данных
    chats.forEach(chat => {
        renderChats(chat, userId)
    });

    // Подключение к сокету уведомлений
    const notifySocket = new WebSocket(
        'ws://'
        + window.location.host
        + '/ws/notifications/'
    );

    notifySocket.onmessage = async function(e) {
      const data = JSON.parse(e.data);
      console.log('Пришло сообщение');

      // Получение нового чата у собеседника
      if (data.type == "new_chat") {
        const response = await fetch(`/api/chats/${data.chat_id}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
            }
        });
        const new_chat = await response.json();
        renderChats(new_chat, userId);
    }};

    searchChat.addEventListener('input', () => {
        const query = searchChat.value.trim().toLowerCase();

        const filtered = query
            ? chats.filter(chat => chat.display_name.toLowerCase().includes(query))
            : chats;

        chatsList.innerHTML = "";

        filtered.forEach(chat => {
            renderChats(chat, userId);
        });
    });

    startChat.addEventListener('click', async () => {
        const selectUserId = startChat.dataset.userId
        if (!selectUserId) return;

        const response = await fetch('/api/chats/get_or_create/', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: selectUserId
            })
        });

        if (!response.ok) {
            showNotification('error', "Не удалось создать/получить чат");
        }

        const chat = await response.json();

        const existingChat = document.querySelector(`.chat-item[data-id="${chat.id}"]`);
        if (!existingChat) {
            renderChats(chat, userId);
        }

        document.querySelector(`.chat-item[data-id="${chat.id}"]`).click();
    });

    // Открытие чата
    document.querySelector('.chats-list').addEventListener('click', async (event) => {
        const clickedItem = event.target.closest('.chat-item');
        if (!clickedItem) return;

        // Убираем класс active у всех элементов
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        // Добавляем класс active к выбранному элементу
        clickedItem.classList.add('active');

        document.querySelector(".msg-header").style.display = "flex";
        document.querySelector(".msg-bottom").style.display = "flex";
        document.querySelector(".selector").style.display = "none";


        // Получаем данные чата
        const chatId = clickedItem.dataset.id;
        const chatAvatar = clickedItem.dataset.avatar;
        const chatTitle = clickedItem.dataset.title;
        const companionValue = clickedItem.dataset.companionId;

        document.getElementById("companionAvatarImg").src = chatAvatar;
        document.getElementById("companionName").textContent = chatTitle;

        // Загрузка профиля собеседника
        let currentCompanion = null;

        const companionElement = document.querySelector('.companion-info');

        // Удаляем старый обработчик
        companionElement.replaceWith(companionElement.cloneNode(true));
        const newCompanionElement = document.querySelector('.companion-info');

        if (!companionValue.includes(',')) {
            const response = await fetch(`/api/users/${companionValue}/profile/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                },
                credentials: "include"
            });

            currentCompanion = await response.json();

            newCompanionElement.addEventListener('click', async () => {
                if (currentCompanion == null) return;
                profileModal.classList.toggle('active');
                await showProfile(currentCompanion, true);
            });
        } else {
            currentCompanion = null;
            newCompanionElement.addEventListener('click', () => {
                const ids = companionValue.split(',').map(id => Number(id.trim()));
            });
        }

        // Загрузка сообщений
        const response = await fetch(`/api/chats/${chatId}/get_messages/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
            }
        });

        msgPage.innerHTML = "";

        // Загрузка истории сообщений
        try {
        const messages = await response.json();

        messages.forEach(message => {
            const isCurrentUser = userId == message.author.id;

            // Функция для вывода в чат сообщений
            renderMessage({
                author: message.author,
                text: message.text,
                created_at: message.created_at,
                author_avatar: message.author.avatar
            }, user, isCurrentUser);
        });
        } catch { // Отлавливаем пустой ответ, который означает что сообщений в чате нет.
            console.log('Сообщений нету');
        }

        // Проверка чтобы не открылось два подключение от одного пользователя
        if (window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
            window.chatSocket.close();
        }

        // Подключение к WebSocket
        const chatSocket = new WebSocket(
             'ws://'
            + window.location.host
            + '/ws/chat/'
            + chatId
            + '/'
        );

        // Получение отправленных сообщений
        chatSocket.onmessage = async function(e) {
            const data = JSON.parse(e.data);
            const isCurrentUser = userId == data.author_id;

            renderMessage({
                author: { id: data.author_id },
                text: data.text,
                created_at: data.time,
                author_avatar: data.author_avatar
            }, user, isCurrentUser);
        };

        chatSocket.onclose = function(e) {
            console.error('Чат сокет закрыт!')
        };

        inputMessage.focus();
        inputMessage.onkeyup = function(e) {
            if (e.key === 'Enter') {
                messageSubmit.click();
            }
        };

        // Отправка сообщений в чат
        messageSubmit.onclick = function(e) {
            const messageInputDom = document.querySelector('.chat-message-input');
            const text = messageInputDom.value;
            chatSocket.send(JSON.stringify({
                'text': text
            }));
            messageInputDom.value = '';
        };
    });

    // Профиль пользователя
    document.getElementById('profileBtn').addEventListener('click', async () => {
        menuModal.classList.remove('active');
        setTimeout(() => {
            menuModal.style.display = 'none';
            menuModal.style.visibility = 'hidden';
        }, 300);
        profileModal.classList.toggle('active');
        await showProfile(user, false);
    });

    document.querySelector('.profile-modal__close-btn').addEventListener('click', () =>{
        profileModal.classList.remove('active');
    });

    document.querySelector('.profile-modal__close-btn').addEventListener('click', () =>{
        profileModal.classList.remove('active');
    });

    // Поиск пользователя
    document.getElementById('searchBtn').addEventListener('click', async () =>{
        menuModal.classList.remove('active');
        setTimeout(() => {
            menuModal.style.display = 'none';
            menuModal.style.visibility = 'hidden';
        }, 300);
        searchModal.style.display='flex';
        searchModalOverlay.style.display='block';

        const response = await fetch(`/api/users/all/`, {
            method: "GET",
            headers: {
                'Authorization': `Token ${token}`,
            }
        });

        allUsers = await response.json();

        renderUsers(allUsers, user);
    });

    // Обработка ввода в поле поиска
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();

        const filtered = allUsers.filter(user =>
            user.username.toLowerCase().includes(query)
        );

        renderUsers(filtered, user);
    });

    searchUsersList.addEventListener('click', async (event) => {
        const clickedUser = event.target.closest('.search-modal__user');
        if (!clickedUser) return;

        searchModal.style.display='none';
        searchModalOverlay.style.display = 'none';

        const selectUserId = clickedUser.dataset.id;

        const response = await fetch(`api/users/${selectUserId}/profile/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
            }
        });

        selectUser = await response.json();
        profileModal.classList.toggle('active');
        await showProfile(selectUser, true);
    });

    document.querySelector('.search-modal__close-btn').addEventListener('click', () =>{
        searchModal.style.display='none';
        searchModalOverlay.style.display = 'none';
    })

    // Меню
    document.getElementById('menuBtn').addEventListener('click', () => {
        menuModal.style.visibility = 'visible';
        menuModal.style.display = 'block';
        setTimeout(() => {
            menuModal.classList.add('active');
        }, 10);
        document.getElementById('menuAvatarImg').src = user.avatar;
        document.getElementById('menuUsername').textContent = user.username;
    });

    document.getElementById('closeMenuBtn').addEventListener('click', () => {
        menuModal.classList.remove('active');

        setTimeout(() => {
            menuModal.style.display = 'none';
            menuModal.style.visibility = 'hidden';
        }, 300);
    });

    // Открытие выбора аватарки
    avatarImg.addEventListener("click", () => {
        avatarInput.click();
    });

    // Отправка аватарки на сервер
    avatarInput.addEventListener("change", async () => {
        const file = avatarInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("avatar", file);  // имя поля зависит от модели

        try {
            const response = await fetch(`/api/users/${userId}/`, {
                method: "PATCH",
                headers: {
                    'Authorization': `Token ${token}`,
                },
                body: formData,
                credentials: "include",
            });

            if (!response.ok) {
                showNotification('error', 'Ошибка загрузки аватара!');
            }

            const data = await response.json();
            avatarImg.src = data.avatar; // подставляем новый путь к изображению
        } catch (err) {
            console.error("Ошибка:", err);
        }
    });

    // Сохранение профиля
    document.getElementById("saveProfile").addEventListener('click', async () => {
        const username = document.querySelector('#profileUsername').value;
        const first_name = document.querySelector('#profileFirstName').value;
        const last_name = document.querySelector('#profileLastName').value;
        const bio = document.querySelector('#profileBio').value;

        const response = await fetch(`/api/users/${userId}/`, {
            method: "PATCH",
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, first_name, last_name, bio })
        });

        if (response.ok) {
            showNotification('success', 'Профиль успешно изменён!');
            profileModal.classList.remove('active');
        } else {
            const data = await response.json();
            const errorText = data.username?.[0] || 'Ошибка при сохранении';
            showNotification('error', errorText);
        }
    });

});