let chatHistories = {}; // Об'єкт для зберігання історії чату для кожного провайдера та моделі

let currentProvider = null; // Поточний провайдер чату
let currentModel = null; // Поточна модель чату
let isWaitingForResponse = false; // Флаг, який запобігає відправці багатьох повідомлень одночасно

function addMessage(message, isUser = false, provider = currentProvider, model = currentModel) {
    const messageData = { // Об'єкт даних повідомлення
        message: message,
        isUser: isUser,
        time: new Date().toLocaleTimeString() // Поточний час
    };

    if (!chatHistories[provider]) { // Якщо історії немає у провайдера, додаємо її
        chatHistories[provider] = {};
    }
    if (!chatHistories[provider][model]) { // Якщо моделі немає в історії провайдера, додаємо її
        chatHistories[provider][model] = [];
    }

    chatHistories[provider][model].push(messageData); // Додаємо повідомлення до історії
    displayMessage(messageData); // Відображаємо повідомлення
}

function displayMessage(messageData) { // Функція для відображення одного повідомлення
    const messageContainer = $('<div>') // Створюємо контейнер для повідомлення
        .addClass('d-flex mb-4 ' + (messageData.isUser ? 'justify-content-end' : 'justify-content-start'));
    const messageContent = $('<div>') // Створюємо контент повідомлення
        .addClass(messageData.isUser ? 'msg_container_send' : 'msg_container')
        .text(messageData.message);
    const timeSpan = $('<span>') // Створюємо елемент для часу
        .addClass(messageData.isUser ? 'msg_time_send' : 'msg_time')
        .text(messageData.time);

    messageContent.append(timeSpan); // Додаємо час до контенту
    messageContainer.append(messageContent); // Додаємо контент до контейнера
    $('#messageFormeight').append(messageContainer); // Додаємо контейнер до області повідомлень

    $('#messageFormeight').scrollTop($('#messageFormeight')[0].scrollHeight); // Скролл до нижнього краю
}

function displayChatHistory(provider, model) { // Відображає історію чату для вибраного постачальника та моделі
    $('#messageFormeight').empty(); // Очищаємо область повідомлень
    if (chatHistories[provider] && chatHistories[provider][model]) { // Якщо історія існує
        chatHistories[provider][model].forEach(messageData => { // Проходимо по всіх повідомленнях
            displayMessage(messageData); // Відображаємо кожне повідомлення
        });
    }
    $('#messageFormeight').scrollTop($('#messageFormeight')[0].scrollHeight); // Скролл до нижнього краю
}

$(document).ready(function () { // При завантаженні документу
    $('#modelDropdown').text('Вибрати модель'); // Встановлюємо текст для меню вибору моделі

    $('#modelDropdownMenu a').click(function (e) { // При кліку на елемент меню
        e.preventDefault(); // Забороняємо дефолтну дію
        if (isWaitingForResponse) return; // Якщо очікуємо відповідь, нічого не робимо
        const provider = $(this).data('provider'); // Отримуємо назву провайдера з даних елемента
        const model = $(this).data('model'); // Отримуємо назву моделі з даних елемента
        currentProvider = provider; // Встановлюємо поточного постачальника
        currentModel = model; // Встановлюємо поточну модель
        $('#modelDropdown').text(`${model} (${provider})`); // Оновлюємо текст меню
        $('#selectModelPrompt').hide(); // Сховати prompt для вибору моделі
        if (!chatHistories[currentProvider] || !chatHistories[currentProvider][currentModel] || chatHistories[currentProvider][currentModel].length === 0) { // Якщо історії немає
            addMessage(`Доброго дня! Я - модель ${model} (${provider}). Можете задати мені питання, яке Вас цікавить.`, false, currentProvider, currentModel); // Додаємо початкове повідомлення
        }
        displayChatHistory(currentProvider, currentModel); // Відображаємо історію чату
    });

    $(document).on('click', function (e) { // При кліку по документу
        if (!$(e.target).closest('#modelDropdownMenu').length && !$(e.target).is('#modelDropdown')) { // Якщо клік не був у меню
            $('#modelDropdownMenu').removeClass('show'); // Сховати меню
        }
    });

    $(document).on('keydown', function (e) { // При натисканні клавіш
        if (e.key === 'Escape') { // Якщо натиснута клавіша Escape
            $('#modelDropdownMenu').removeClass('show'); // Сховати меню
        }
    });

    $('#selectModelPrompt').show(); // Показати prompt для вибору моделі
});

$('#send-btn').click(sendMessage); // Зв'язати функцію відправки повідомлення з кнопкою

$('#message').keypress(function (e) { // При натисканні клавіш в полі введення
    if (e.which == 13 && !e.shiftKey) { // Якщо натиснута клавіша Enter і не нажатий Shift
        sendMessage(); // Відправити повідомлення
        return false; // Заборонити дефолтну дію
    }
});

function sendMessage() { // Функція відправки повідомлення користувача
    if (isWaitingForResponse || !currentProvider || !currentModel) { // Якщо очікуємо відповідь або не вибраний провайдер/модель
        return; // Нічого не робити
    }

    const message = $('#message').val().trim(); // Отримати текст повідомлення

    if (message) { // Якщо повідомлення не пусте
        addMessage(message, true); // Додати повідомлення користувача до історії
        isWaitingForResponse = true; // Встановити флаг очікування відповіді
        disableDropdownAndSendButton(); // Відключити меню та кнопку відправки

        $.ajax({ // Відправити AJAX POST запит
            url: `/get/${encodeURIComponent(currentProvider)}/${encodeURIComponent(currentModel)}`, // Кодування назви провайдера та моделі в URL
            type: 'POST',
            data: {msg: message}, // Відправити дані повідомлення
            success: function (response) { // При успішній відповіді
                addMessage(response.response); // Додати текст відповіді
                isWaitingForResponse = false; // Скинути флаг очікування
                enableDropdownAndSendButton(); // Включити меню та кнопку відправки
            },
            error: function () { // При помилці
                addMessage("Вибачте, сталася помилка. Спробуйте ще раз пізніше.", false); // Додати текст помилки
                isWaitingForResponse = false; // Скинути флаг очікування
                enableDropdownAndSendButton(); // Включити меню та кнопку відправки
            }
        });

        $('#message').val(''); // Очистити поле введення
    }
}

function disableDropdownAndSendButton() { // Функція відключає меню та кнопку відправки
    $('#modelDropdown').addClass('disabled-btn');
    $('#send-btn').addClass('disabled-btn');
    $('#message').prop('disabled', true);
}

function enableDropdownAndSendButton() { // Функція вмикає меню та кнопку відправки
    $('#modelDropdown').removeClass('disabled-btn');
    $('#send-btn').removeClass('disabled-btn');
    $('#message').prop('disabled', false);
}