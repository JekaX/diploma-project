// Змінна для відстеження історії повідомлень для кожної моделі
let chatHistories = {
    'chatgpt': [],
    'gemini': [],
    'claude': [],
    'lmstudio': [],
};

// Поточна вибрана модель
let currentProvider = 'chatgpt';

// Змінна для відстеження стану очікування відповіді від моделі
let isWaitingForResponse = false;

// Функція для додавання повідомлення до історії та відображення його
function addMessage(message, isUser = false, provider = currentProvider) {
    const messageData = {
        message: message,
        isUser: isUser,
        time: new Date().toLocaleTimeString()
    };

    chatHistories[provider].push(messageData);
    displayMessage(messageData);
}

// Функція для відображення повідомлення на екрані
function displayMessage(messageData) {
    const messageContainer = $('<div>').addClass('d-flex mb-4 ' + (messageData.isUser ? 'justify-content-end' : 'justify-content-start'));
    const messageContent = $('<div>').addClass(messageData.isUser ? 'msg_container_send' : 'msg_container').text(messageData.message);
    const timeSpan = $('<span>').addClass(messageData.isUser ? 'msg_time_send' : 'msg_time').text(messageData.time);

    messageContent.append(timeSpan);
    messageContainer.append(messageContent);
    $('#messageFormeight').append(messageContainer);

    $('#messageFormeight').scrollTop($('#messageFormeight')[0].scrollHeight);
}

// Функція для відображення історії повідомлень для обраної моделі
function displayChatHistory(provider) {
    $('#messageFormeight').empty();
    chatHistories[provider].forEach(messageData => {
        displayMessage(messageData);
    });
    $('#messageFormeight').scrollTop($('#messageFormeight')[0].scrollHeight);
}

// Привітальні повідомлення для кожної моделі
const welcomeMessages = {
    'chatgpt': "Привіт! Я ChatGPT від OpenAI. Чим можу допомогти?",
    'gemini': "Привіт! Я Gemini від Google. Чим можу допомогти?",
    'claude': "Привіт! Я Claude від Anthropic. Чим можу допомогти?",
    'lmstudio': "Привіт! Я Llama-3.2-1B-Instruct від LM Studio. Чим можу допомогти?",
};

// Ініціалізація та обробка подій при завантаженні сторінки
$(document).ready(function() {
    // Обробка події перемикання вкладок
    $('a[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
        if (isWaitingForResponse) {
            e.preventDefault(); // Блокуємо перемикання вкладок під час очікування відповіді
            return;
        }

        const newProvider = $(e.target).attr('href').substring(1);

        if (currentProvider !== newProvider) {
            currentProvider = newProvider;

            if (chatHistories[currentProvider].length === 0) {
                addMessage(welcomeMessages[currentProvider], false, currentProvider);
            }

            displayChatHistory(currentProvider);
        }
    });

    // Відображення історії повідомлень для початкової моделі
    if (chatHistories['chatgpt'].length === 0) {
        addMessage(welcomeMessages['chatgpt']);
    } else {
        displayChatHistory('chatgpt');
    }
});

// Обробка події натискання кнопки відправки повідомлення
$('#send-btn').click(sendMessage);

// Обробка події натискання клавіші Enter у полі введення повідомлення
$('#message').keypress(function(e) {
    if(e.which == 13 && !e.shiftKey) {
        sendMessage();
        return false;
    }
});

// Функція для відправки повідомлення
function sendMessage() {
    if (isWaitingForResponse) {
        return; // Блокуємо відправку повідомлення під час очікування відповіді
    }

    const message = $('#message').val().trim();

    if(message) {
        addMessage(message, true);

        isWaitingForResponse = true; // Встановлюємо стан очікування відповіді
        disableTabsAndSendButton(); // Вимикаємо вкладки та кнопку відправки

        $.ajax({
            url: `/get/${currentProvider}`,
            type: 'POST',
            data: {msg: message},
            success: function(response) {
                addMessage(response.response);
                isWaitingForResponse = false; // Знімаємо стан очікування відповіді
                enableTabsAndSendButton(); // Вмикаємо вкладки та кнопку відправки
            },
            error: function() {
                addMessage("Вибачте, сталася помилка. Спробуйте ще раз пізніше.", false);
                isWaitingForResponse = false; // Знімаємо стан очікування відповіді
                enableTabsAndSendButton(); // Вмикаємо вкладки та кнопку відправки
            }
        });

        $('#message').val('');
    }
}

// Функція для вимкнення вкладок та кнопки відправки
function disableTabsAndSendButton() {
    $('a[data-bs-toggle="tab"]').addClass('disabled-tab');
    $('#send-btn').addClass('disabled-btn');
    $('#message').prop('disabled', true);
}

// Функція для ввімкнення вкладок та кнопки відправки
function enableTabsAndSendButton() {
    $('a[data-bs-toggle="tab"]').removeClass('disabled-tab');
    $('#send-btn').removeClass('disabled-btn');
    $('#message').prop('disabled', false);
}