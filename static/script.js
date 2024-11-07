let chatHistories = {};

let currentProvider = null;
let currentModel = null;
let isWaitingForResponse = false;

function addMessage(message, isUser = false, provider = currentProvider, model = currentModel) {
    const messageData = {
        message: message,
        isUser: isUser,
        time: new Date().toLocaleTimeString()
    };

    if (!chatHistories[provider]) {
        chatHistories[provider] = {};
    }
    if (!chatHistories[provider][model]) {
        chatHistories[provider][model] = [];
    }

    chatHistories[provider][model].push(messageData);
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

function displayChatHistory(provider, model) {
    $('#messageFormeight').empty();
    if (chatHistories[provider] && chatHistories[provider][model]) {
        chatHistories[provider][model].forEach(messageData => {
            displayMessage(messageData);
        });
    }
    $('#messageFormeight').scrollTop($('#messageFormeight')[0].scrollHeight);
}

const welcomeMessages = {
    'openai': "Привіт! Я ChatGPT від OpenAI. Чим можу допомогти?",
    'google': "Привіт! Я Gemini від Google. Чим можу допомогти?",
    'anthropic': "Привіт! Я Claude від Anthropic. Чим можу допомогти?",
    'lmstudio': "Привіт! Я Llama-3.2-1B-Instruct від LM Studio. Чим можу допомогти?",
    'vectorshift': "Привіт! Я VectorShift від VectorShift.ai. Чим можу допомогти?",
    'ollama': "Привіт! Я Ollama від Ollama.ai. Чим можу допомогти?",
    'groq': "Привіт! Я Groq від Groq.ai. Чим можу допомогти?"
};

$(document).ready(function() {
    $('#modelDropdown').text('Select a model');

    $('#modelDropdownMenu a').click(function(e) {
        e.preventDefault();
        if (isWaitingForResponse) return;
        const provider = $(this).data('provider');
        const model = $(this).data('model');
        currentProvider = provider;
        currentModel = model;
        $('#modelDropdown').text(`${model} (${provider})`);
        $('#selectModelPrompt').hide();
        if (!chatHistories[currentProvider] || !chatHistories[currentProvider][currentModel] || chatHistories[currentProvider][currentModel].length === 0) {
            addMessage(welcomeMessages[currentProvider], false, currentProvider, currentModel);
        }
        displayChatHistory(currentProvider, currentModel);
    });

    $(document).on('click', function(e) {
        if (!$(e.target).closest('#modelDropdownMenu').length && !$(e.target).is('#modelDropdown')) {
            $('#modelDropdownMenu').removeClass('show');
        }
    });

    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            $('#modelDropdownMenu').removeClass('show');
        }
    });

    $('#selectModelPrompt').show();
});

$('#send-btn').click(sendMessage);

$('#message').keypress(function(e) {
    if(e.which == 13 && !e.shiftKey) {
        sendMessage();
        return false;
    }
});

function sendMessage() {
    if (isWaitingForResponse || !currentProvider || !currentModel) {
        return;
    }

    const message = $('#message').val().trim();

    if(message) {
        addMessage(message, true);

        isWaitingForResponse = true;
        disableDropdownAndSendButton();

        $.ajax({
            url: `/get/${currentProvider}/${currentModel}`,
            type: 'POST',
            data: {msg: message},
            success: function(response) {
                addMessage(response.response);
                isWaitingForResponse = false;
                enableDropdownAndSendButton();
            },
            error: function() {
                addMessage("Вибачте, сталася помилка. Спробуйте ще раз пізніше.", false);
                isWaitingForResponse = false;
                enableDropdownAndSendButton();
            }
        });

        $('#message').val('');
    }
}

function disableDropdownAndSendButton() {
    $('#modelDropdown').addClass('disabled-btn');
    $('#send-btn').addClass('disabled-btn');
    $('#message').prop('disabled', true);
}

function enableDropdownAndSendButton() {
    $('#modelDropdown').removeClass('disabled-btn');
    $('#send-btn').removeClass('disabled-btn');
    $('#message').prop('disabled', false);
}