// Об'єкт для зберігання історії чатів для кожного провайдера
let chatHistories = {
    'openai': [],
    'lmstudio': []
};

let currentProvider = 'openai';

// Функція для додавання повідомлення до чату
function addMessage(message, isUser = false, provider = currentProvider) {
    const messageData = {
        message: message,
        isUser: isUser,
        time: new Date().toLocaleTimeString()
    };

    // Зберігаємо повідомлення в історії
    chatHistories[provider].push(messageData);

    // Відображаємо повідомлення
    displayMessage(messageData);
}

// Функція для відображення повідомлення
function displayMessage(messageData) {
    const messageContainer = $('<div>').addClass('d-flex mb-4 ' + (messageData.isUser ? 'justify-content-end' : 'justify-content-start'));
    const messageContent = $('<div>').addClass(messageData.isUser ? 'msg_container_send' : 'msg_container').text(messageData.message);
    const timeSpan = $('<span>').addClass(messageData.isUser ? 'msg_time_send' : 'msg_time').text(messageData.time);

    messageContent.append(timeSpan);
    messageContainer.append(messageContent);
    $('#messageFormeight').append(messageContainer);

    // Плавно прокручуємо до нового повідомлення
    $('#messageFormeight').animate({
        scrollTop: $('#messageFormeight')[0].scrollHeight
    }, 500);
}

// Функція для відображення історії конкретного провайдера
function displayChatHistory(provider) {
    $('#messageFormeight').empty();
    chatHistories[provider].forEach(messageData => {
        displayMessage(messageData);
    });

    // Додаємо прокрутку до останнього повідомлення
    $('#messageFormeight').scrollTop($('#messageFormeight')[0].scrollHeight);
}

// Ініціалізація вкладок Bootstrap
$(document).ready(function() {
    // Обробник зміни вкладки
    $('a[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
        // Отримуємо ID активної вкладки
        const newProvider = $(e.target).attr('href').substring(1); // Видаляємо # з href

        // Якщо змінився провайдер
        if (currentProvider !== newProvider) {
            currentProvider = newProvider;

            // Якщо історія для цього провайдера пуста, додаємо вітальне повідомлення
            if (chatHistories[currentProvider].length === 0) {
                const welcomeMessage = currentProvider === 'openai'
                    ? "Привіт! Я OpenAI чат-бот. Чим можу допомогти?"
                    : "Привіт! Я LM Studio чат-бот. Чим можу допомогти?";
                addMessage(welcomeMessage, false, currentProvider);
            }

            // Відображаємо історію для поточного провайдера
            displayChatHistory(currentProvider);
        }
    });

    // Додаємо початкове повідомлення при завантаженні сторінки
    if (chatHistories['openai'].length === 0) {
        addMessage("Привіт! Я OpenAI чат-бот. Чим можу допомогти?");
    } else {
        displayChatHistory('openai');
    }
});

// Обробник події для кнопки відправки
$('#send-btn').click(sendMessage);

// Обробник події для поля вводу (відправка по Enter)
$('#message').keypress(function(e) {
    if(e.which == 13) {
        sendMessage();
        return false;
    }
});

// Функція для відправки повідомлення
function sendMessage() {
    const message = $('#message').val().trim();

    if(message) {
        // Додаємо повідомлення користувача до чату
        addMessage(message, true);

        // Відправляємо запит на сервер
        $.ajax({
            url: `/get/${currentProvider}`,
            type: 'POST',
            data: {msg: message},
            success: function(response) {
                // Додаємо відповідь бота до чату
                addMessage(response.response);
            },
            error: function() {
                addMessage("Вибачте, сталася помилка. Спробуйте ще раз пізніше.", false);
            }
        });

        // Очищаємо поле вводу
        $('#message').val('');
    }
}