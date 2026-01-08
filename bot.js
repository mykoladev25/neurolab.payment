require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_TELEGRAM_ID;

const bot = new TelegramBot(token, { polling: true });

// Зберігаємо clientId для кожного користувача
const userSessions = new Map();

// Обробка /start з deep link
bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const clientId = match[1].trim();
    
    if (clientId) {
        userSessions.set(chatId, { clientId: clientId });
        
        await bot.sendMessage(chatId, 
            `Вітаємо! 👋\n\n` +
            `Ви зареєструвалися на курс AI Майстер-Клас.\n\n` +
            `Ваш ID: <code>${clientId}</code>\n\n` +
            `📸 Будь ласка, надішліть скріншот або фото підтвердження оплати 2700 грн.\n\n` +
            `Після перевірки ви отримаєте доступ до курсу.`,
            { parse_mode: 'HTML' }
        );
    } else {
        await bot.sendMessage(chatId, 
            '👋 Для початку перейдіть за посиланням з email або з сайту neurolab.fun'
        );
    }
});

// Обробка фото
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const session = userSessions.get(chatId);
    
    if (!session) {
        await bot.sendMessage(chatId, 
            'Спочатку перейдіть за посиланням з email для початку процесу оплати.'
        );
        return;
    }
    
    const photo = msg.photo[msg.photo.length - 1];
    const userName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
    
    // Надіслати адміну з кнопками
    await bot.sendPhoto(adminId, photo.file_id, {
        caption: 
            `💰 <b>Підтвердження оплати</b>\n\n` +
            `👤 <b>Від:</b> ${userName}\n` +
            `🆔 <b>Client ID:</b> <code>${session.clientId}</code>\n` +
            `👤 <b>Telegram:</b> @${msg.from.username || 'немає username'}\n` +
            `📱 <b>Chat ID:</b> <code>${chatId}</code>`,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [[
                { text: '✅ Підтвердити оплату', callback_data: `approve_${chatId}_${session.clientId}` },
                { text: '❌ Відхилити', callback_data: `reject_${chatId}_${session.clientId}` }
            ]]
        }
    });
    
    await bot.sendMessage(chatId, 
        '✅ Дякуємо! Скріншот отримано.\n\n' +
        'Зачекайте підтвердження адміністратора (зазвичай до 30 хвилин).\n\n' +
        'Ми повідомимо вас, як тільки оплата буде підтверджена.'
    );
});

// Обробка кнопок від адміна
bot.on('callback_query', async (query) => {
    const [action, chatId, clientId] = query.data.split('_');
    
    if (action === 'approve') {
        // Надіслати клієнту
        await bot.sendMessage(chatId, 
            '🎉 <b>Оплата підтверджена!</b>\n\n' +
            '✅ Ваш доступ до курсу активовано.\n\n' +
            '📚 <b>Посилання на курс:</b>\n' +
            'https://neurolab.fun/course\n\n' +
            '📧 Логін та пароль надіслано на ваш email.\n\n' +
            'Гарного навчання! 🚀',
            { parse_mode: 'HTML' }
        );
        
        // Відповісти адміну
        await bot.answerCallbackQuery(query.id, { 
            text: '✅ Оплату підтверджено! Клієнту надіслано доступ.' 
        });
        
        // Відредагувати повідомлення адміна
        await bot.editMessageCaption(
            query.message.caption + '\n\n✅ <b>ПІДТВЕРДЖЕНО</b>',
            {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: 'HTML'
            }
        );
        
    } else if (action === 'reject') {
        // Надіслати клієнту
        await bot.sendMessage(chatId, 
            '❌ На жаль, не вдалося підтвердити оплату.\n\n' +
            'Можливі причини:\n' +
            '• Неправильна сума\n' +
            '• Невірні реквізити\n' +
            '• Неякісний скріншот\n\n' +
            '💬 Зв\'яжіться з підтримкою для уточнення.',
            { parse_mode: 'HTML' }
        );
        
        // Відповісти адміну
        await bot.answerCallbackQuery(query.id, { 
            text: '❌ Оплату відхилено. Клієнту надіслано повідомлення.' 
        });
        
        // Відредагувати повідомлення адміна
        await bot.editMessageCaption(
            query.message.caption + '\n\n❌ <b>ВІДХИЛЕНО</b>',
            {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: 'HTML'
            }
        );
    }
});

console.log('🤖 Telegram Bot запущено...');