let chatHistories = {
    'chatgpt': [],
    'gemini': [],
    'claude': [],
    'lmstudio': [],
};

let currentProvider = 'chatgpt';
let isWaitingForResponse = false; // Додаємо змінну для відстеження стану очікування відповіді

function addMessage(message, isUser = false, provider = currentProvider) {
    const messageData = {
        message: message,
        isUser: isUser,
        time: new Date().toLocaleTimeString()
    };

    chatHistories[provider].push(messageData);
    displayMessage(messageData);
}

function displayMessage(messageData) {
    const messageContainer = $('<div>').addClass('d-flex mb-4 ' + (messageData.isUser ? 'justify-content-end' : 'justify-content-start'));
    const messageContent = $('<div>').addClass(messageData.isUser ? 'msg_container_send' : 'msg_container').text(messageData.message);
    const timeSpan = $('<span>').addClass(messageData.isUser ? 'msg_time_send' : 'msg_time').text(messageData.time);

    messageContent.append(timeSpan);
    messageContainer.append(messageContent);
    $('#messageFormeight').append(messageContainer);

    $('#messageFormeight').scrollTop($('#messageFormeight')[0].scrollHeight);
}

function displayChatHistory(provider) {
    $('#messageFormeight').empty();
    chatHistories[provider].forEach(messageData => {
        displayMessage(messageData);
    });
    $('#messageFormeight').scrollTop($('#messageFormeight')[0].scrollHeight);
}

const welcomeMessages = {
    'chatgpt': "Привіт! Я ChatGPT від OpenAI. Чим можу допомогти?",
    'gemini': "Привіт! Я Gemini від Google. Чим можу допомогти?",
    'claude': "Привіт! Я Claude від Anthropic. Чим можу допомогти?",
    'lmstudio': "Привіт! Я Llama-3.2-1B-Instruct від LM Studio. Чим можу допомогти?",
};

$(document).ready(function() {
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

    if (chatHistories['chatgpt'].length === 0) {
        addMessage(welcomeMessages['chatgpt']);
    } else {
        displayChatHistory('chatgpt');
    }
});

$('#send-btn').click(sendMessage);

$('#message').keypress(function(e) {
    if(e.which == 13 && !e.shiftKey) {
        sendMessage();
        return false;
    }
});

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

function disableTabsAndSendButton() {
    $('a[data-bs-toggle="tab"]').addClass('disabled-tab');
    $('#send-btn').addClass('disabled-btn');
    $('#message').prop('disabled', true);
}

function enableTabsAndSendButton() {
    $('a[data-bs-toggle="tab"]').removeClass('disabled-tab');
    $('#send-btn').removeClass('disabled-btn');
    $('#message').prop('disabled', false);
}