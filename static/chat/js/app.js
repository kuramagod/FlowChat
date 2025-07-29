async function get_user() {
    try {
        const response = await fetch('/api/users/me/', {
            method: 'GET',
            credentials: 'include',
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

function renderMessage({ author, text, created_at, author_avatar }, user, isCurrentUser, chatAvatar, chatTitle) {
    const time = formatTime(created_at);
    const avatar = isCurrentUser ? user.avatar : author_avatar;

    let html = '';

    if (isCurrentUser) {
        html = `
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
        document.getElementById("companionAvatarImg").src = chatAvatar;
        document.getElementById("companionName").innerHTML = `<p>${chatTitle}</p>`;
        html = `
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

function showProfile(obj, mode) {
    document.querySelector('.profile-modal__title').innerHTML = mode ? `Профиль` : `Настройки профиля`;
    document.getElementById("profileMainUsername").innerHTML = `${obj.username}`

    avatarInput.disabled = mode;
    avatarImg.src = obj.avatar;
    avatarImg.style.cursor = mode ? 'default': 'pointer';

    profileUsername.readOnly = mode;
    profileUsername.value = obj.username;

    profileFirstName.readOnly = mode;
    profileFirstName.value = obj.first_name

    profileLastName.readOnly = mode;
    profileLastName.value = obj.last_name

    profileBio.readOnly = mode;
    profileBio.value = obj.bio

    logoutBtn.style.display = mode ? 'none' : 'flex';
    saveProfile.style.display = mode ? 'none' : 'flex';
}

document.addEventListener('DOMContentLoaded', async function () {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

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

    // АВТОРИЗАЦИЯ
    document.getElementById('authBtn').addEventListener('click', async () => {
        const username = document.querySelector('#username_auth').value;
        const password = document.querySelector('#password_auth').value;

        const response = await fetch(`/api/login/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            authModal.style.display = 'none';
            modalOverlay.style.display = 'none';
            chatApp.style.display = 'flex';
            window.location.reload();
        } else {
            const data = await response.json();
            document.getElementById("errorAuth").innerHTML = `<p style="color: red">Вы ввели неверный логин или пароль!</p>`;
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
                'X-CSRFToken': csrfToken,
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
        response = await fetch(`/api-auth/logout/`, {
            method: "POST",
            headers: {
                'X-CSRFToken': csrfToken,
            },
            credentials: 'include',
        });

        if (response.ok) {
            window.location.reload();
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
        credentials: "include"  // обязательно, чтобы передавались куки авторизации
    });

    if (!response.ok) {
        throw new Error("Ошибка получения чатов");
    }

    const chats = await response.json();
    chatsList.innerHTML = "";  // очистим список перед добавлением

    chats.forEach(chat => {
        const chatId = chat.id;
        const isGroup = chat.is_group;
        let companionId = -1;
        if (!isGroup) {
            companionId = chat.members[0] == userId ? chat.members[1] : chat.members[0];
        }
        const chatAvatar = chat.display_photo;
        const title = chat.display_name;
        const lastMessage = chat.last_message;
        const messageTime = formatTime(chat.created_at);

        const chatHTML = `
            <div class="chat-item" data-id=${chatId} data-title=${title} data-avatar=${chatAvatar} data-compid=${companionId}>
                <img src="${chatAvatar}" class="chat-avatar">
                <div class="chat-info">
                    <span class="chat-name">${title}</span>
                    <span class="last-message">${lastMessage}</span>
                </div>
                <span class="message-time">${messageTime}</span>
            </div>
        `;
        chatsList.insertAdjacentHTML("beforeend", chatHTML);
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

        // Получаем ID чата
        const chatId = clickedItem.dataset.id;
        const chatAvatar = clickedItem.dataset.avatar;
        const chatTitle = clickedItem.dataset.title;
        const compId = clickedItem.dataset.compid;
        let currentCompanion = null;

        const companionElement = document.querySelector('.companion-info');

        // Удаляем старый обработчик
        companionElement.replaceWith(companionElement.cloneNode(true));
        const newCompanionElement = document.querySelector('.companion-info');

        if (compId != -1) {
            const response = await fetch(`/api/users/${compId}/profile/`, {
                method: 'GET',
                credentials: "include"
            });

            currentCompanion = await response.json();

            newCompanionElement.addEventListener('click', () => {
                if (currentCompanion == null) return;
                profileModal.classList.toggle('active');
                showProfile(currentCompanion, true);
            });
        } else {
            currentCompanion = null;
        }

        const response = await fetch(`/api/chats/${chatId}/get_messages/`, {
            method: 'GET',
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Ошибка получения чатов");
        }

        msgPage.innerHTML = "";

        // Загрузка истории сообщений
        const messages = await response.json();
        messages.forEach(message => {
            const isCurrentUser = userId == message.author.id;

            // Функция для вывода в чат сообщений
            renderMessage({
                author: message.author,
                text: message.text,
                created_at: message.created_at,
                author_avatar: message.author.avatar
            }, user, isCurrentUser, chatAvatar, chatTitle);
        });

        // Подключение к WebSocket
        const chatSocket = new WebSocket(
             'ws://'
            + window.location.host
            + '/ws/chat/'
            + chatId
            + '/'
        );

        // Получение отправленных сообщений
        chatSocket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            const isCurrentUser = userId == data.author_id;

            renderMessage({
                author: { id: data.author_id },
                text: data.text,
                created_at: data.time,
                author_avatar: data.author_avatar
            }, user, isCurrentUser, chatAvatar, chatTitle);
            console.log("Чат сокет");
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

    // ПРОФИЛЬ
    document.getElementById('menuBtn').addEventListener('click', () => {
        profileModal.classList.toggle('active');
        showProfile(user, false);
    });

    document.querySelector('.profile-modal__close-btn').addEventListener('click', () =>{
        profileModal.classList.remove('active');
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
                    'X-CSRFToken': csrfToken,
                },
                body: formData,
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Ошибка обновления аватара");
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
                'X-CSRFToken': csrfToken,
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