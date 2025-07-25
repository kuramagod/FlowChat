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


document.addEventListener('DOMContentLoaded', async function () {
    const user = await get_user();
    let userId = null
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const authBtn = document.getElementById('authBtn');
    const openRegBtn = document.getElementById('openRegBtn');
    const backBtn = document.getElementById('backBtn');
    const regBtn = document.getElementById('regBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const authModal = document.querySelector('.auth-modal');
    const regModal = document.querySelector('.reg-modal');
    const chatApp = document.querySelector('.chat-app');
    const chatsList = document.getElementById("chatsList");
    const msgPage = document.getElementById("msgPage");
    const chatItemBtn = document.getElementById("chatItemBtn");
    const profileModal = document.querySelector('.profile-modal')
    const menuBtn = document.getElementById('menuBtn');
    const errorAuth = document.getElementById("errorAuth")
    const closeBtn = document.querySelector('.profile-modal__close-btn')
    const avatarImg = document.getElementById("avatarImg");
    const avatarInput = document.getElementById("avatarInput");
    const companionAvatarImg = document.getElementById("companionAvatarImg");
    const companionName = document.getElementById("companionName");
    const profileUsername = document.getElementById("profileUsername");
    const profileFirstName = document.getElementById("profileFirstName");
    const profileLastName = document.getElementById("profileLastName");
    const profileMainUsername = document.getElementById("profileMainUsername");
    const profileBio = document.getElementById("profileBio");
    const saveProfile = document.getElementById("saveProfile");
    const msgHeader = document.querySelector(".msg-header");
    const msgBottom = document.querySelector(".msg-bottom");
    const selector = document.querySelector(".selector");

    // Функция проверки авторизации пользователя
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

    // Обработка авторизации
    authBtn.addEventListener('click', async () => {
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
            errorAuth.innerHTML = `<p style="color: red">Вы ввели неверный логин или пароль!</p>`;
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

    // Регистрация пользователя
    regBtn.addEventListener('click', async () => {
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

    openRegBtn.addEventListener('click', () => {
        authModal.style.display = 'none';
        regModal.style.display = 'flex';
    });

    backBtn.addEventListener('click', () => {
        regModal.style.display = 'none';
        authModal.style.display = 'flex';
    });

    menuBtn.addEventListener('click', () => {
        profileModal.classList.toggle('active');
        profileMainUsername.innerHTML = `${user.username}`
        profileUsername.value = `${user.username}`
        profileFirstName.value = `${user.first_name}`
        profileLastName.value = `${user.last_name}`
        profileBio.value = `${user.bio}`
    });

    saveProfile.addEventListener('click', async () => {
        const username = document.querySelector('#profileUsername').value;
        const first_name = document.querySelector('#profileFirstName').value;
        const last_name = document.querySelector('#profileLastName').value;
        const bio = document.querySelector('#profileBio').value;

        response = await fetch(`/api/users/${userId}/`, {
            method: "PATCH",
            headers: {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, first_name, last_name, bio })
        });

        if (response.ok) {
            window.location.reload();
        } else {
            const data = await response.json();
            alert(`${data.username[0]}`);
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () =>{
            profileModal.classList.remove('active');
        });
    }

    // Открытие выбора файла
    avatarImg.addEventListener("click", () => {
        avatarInput.click();
    });

    // После выбора файла — отправляем его
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

    // Загрузка чатов
    try {
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
            const chatAvatar = chat.display_photo
            const title = chat.display_name;
            const lastMessage = chat.last_message;
            const messageTime = formatTime(chat.created_at); // можно добавить поле created_at

            const chatHTML = `
                <div class="chat-item" data-id=${chatId} data-title=${title} data-avatar=${chatAvatar}>
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

    } catch (error) {
        console.error("Ошибка загрузки чатов:", error);
    }

    document.querySelector('.chats-list').addEventListener('click', async (event) => {
        const clickedItem = event.target.closest('.chat-item');
        if (!clickedItem) return;

        // Убираем класс active у всех элементов
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        // Добавляем класс active к выбранному элементу
        clickedItem.classList.add('active');
        msgHeader.style.display = "flex";
        msgBottom.style.display = "flex";
        selector.style.display = "none";

        // Получаем ID чата
        const chatId = clickedItem.dataset.id;
        const chatAvatar = clickedItem.dataset.avatar;
        const chatTitle = clickedItem.dataset.title;

        const response = await fetch(`/api/chats/${chatId}/get_messages/`, {
            method: 'GET',
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Ошибка получения чатов");
        }

        msgPage.innerHTML = "";

        const messages = await response.json();
//        console.log(messages);
        messages.forEach(message => {
            const authorId = message.author.id
            const userAvatar = user.avatar
            const authorAvatar = message.author.avatar
            const text = message.text
            const time = formatTime(message.created_at)
            let msgPageHTML = ``
            if (userId == authorId) {
            msgPageHTML = `
                <div class="outgoing-chats">
                    <div class="outgoing-chats-img">
                        <img src="${userAvatar}">
                    </div>
                    <div class="outgoing-chats-msg">
                        <p>${text}</p>
                        <span class="time">${time}</span>
                    </div>
                </div>
            `
            } else {
            companionAvatarImg.src = chatAvatar;
            companionName.innerHTML = `<p>${chatTitle}</p>`;
            msgPageHTML = `
                <div class="received-chats">
                    <div class="received-chats-img">
                        <img src="${authorAvatar}">
                    </div>
                    <div class="received-msg-inbox">
                        <p>${text}</p>
                        <span class="time">${time}</span>
                    </div>
                </div>
            `
            }
            msgPage.insertAdjacentHTML("beforeend", msgPageHTML);

        })

    });

});