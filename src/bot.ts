import { Bot, InlineKeyboard } from "grammy";
import { addUser, loadUsers, userExists } from "./storage";

const bot = new Bot(process.env.BOT_TOKEN!);

// ID админа
const ADMIN_ID = +process.env.ADMIN_ID!; // замени

// -----------------
// 1. Команда /start
// -----------------

bot.command("start", async (ctx) => {
    const kb = new InlineKeyboard().text("Оставить заявку", "apply");

    await ctx.replyWithPhoto(
        "https://i.ibb.co/v48fdkQR/Frame-7.png", // любое изображение
        {
            parse_mode: "HTML",
            caption: '<b>Зима близко... А значит, что скоро наступят холода, появятся очереди за горошком, и пройдёт ВТОРАЯ ВСТРЕЧА нашего сообщества.</b> \n' +
                '\n' +
                '@moldit_chat решили провести предновогоднюю встречу нашего коммунити, чтобы с кайфом и настроением войти в новый, 2026 год. \n' +
                'Была куча отзывов и комплиментов после прошлой встречи. Всё учли. Эта будет ещё лучше 💯 \n\n' +
                '🗓️ Дата: 20 декабря (время и место уточним позже)',

            reply_markup: kb,
        }
    );
});

// -----------------
// Обработка кнопки
// -----------------

bot.callbackQuery("apply", async (ctx) => {
    const user = ctx.from!;

    if(await userExists(user.id))  {
        await ctx.answerCallbackQuery();
        return await ctx.reply("Мы уже приняли вашу заявку. Ожидайте последующих новостей о мероприятии 😉");
    }

    const nick =
        user.username ? "@" + user.username : `${user.first_name} ${user.last_name ?? ""}`;

    // а) админу
    await ctx.api.sendMessage(
        ADMIN_ID,
        `Новая заявка!\nПользователь: ${nick}\nID: ${user.id}`
    );

    // б) пользователю
    await ctx.answerCallbackQuery();
    await ctx.reply("Мы получили вашу заявку. С дополнительными вопросами можно написать @imiuvis.\n\n🛑 Важная информация! На мероприятии каждый оплачивает свой счёт. Просим быть внимательными.\n\nДата: 20 декабря 15:00\nМесто: ресторан Loft Pub (Decebal Blvd 20)\nhttps://share.google/ThjFRSsCDmyxx0nWb");

    // сохранить в локальную базу
    await addUser(user.id, nick);
});

// --------------------------
// 3. Список гостей для админа
// --------------------------

bot.command('ex', async ctx => {
    await ctx.reply('<b>Место встречи определено!</b>\n\n🛑 Важная информация! На мероприятии каждый оплачивает свой счёт. Просим быть внимательными.\n\nДата: 20 декабря 15:00 (бронь на имя Кирилл)\nМесто: ресторан Loft Pub (Decebal Blvd 20)\nhttps://share.google/ThjFRSsCDmyxx0nWb', {
        parse_mode: 'HTML'
    })
})

bot.command("guests", async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) return;

    const users = await loadUsers();

    if (users.length === 0) {
        await ctx.reply("Список гостей пуст.");
        return;
    }

    // Формируем ASCII таблицу
    let message = "📋 <b>Список гостей:</b>\n\n";

    users.forEach((user, index) => {
        message += `${index + 1}. ${user.username}\n`;
    });

    message += `\n<b>Всего гостей: ${users.length}</b>`;

    await ctx.reply(message, { parse_mode: "HTML" });
});

// --------------------------
// 4. Рассылка от админа
// --------------------------

let waitingForBroadcast = false;

// команду видно только админу
bot.command("broadcast", async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) return;

    waitingForBroadcast = true;

    const kb = new InlineKeyboard().text("Отменить", "cancel_broadcast");

    await ctx.reply("Введи текст рассылки:", {
        reply_markup: kb,
    });
});

// кнопка "Отменить"
bot.callbackQuery("cancel_broadcast", async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) return;

    waitingForBroadcast = false;
    await ctx.editMessageText("Рассылка отменена.");
});

// слушаем обычные сообщения админа
bot.on("message:text", async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) return;
    if (!waitingForBroadcast) return;

    waitingForBroadcast = false;

    const msgText = ctx.message.text;
    const users = await loadUsers();

    await ctx.reply(`Рассылка начата. Получателей: ${users.length}`);

    // Рассылка
    for (const user of users) {
        try {
            await ctx.api.sendMessage(user.id, msgText);
        } catch (e) {
            console.log("Не удалось отправить:", user.id);
        }
    }

    await ctx.reply("Готово!");
});

// --------------------------

bot.start();
console.log("Bot is running...");
