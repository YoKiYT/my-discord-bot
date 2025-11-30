// index.js (Phiên bản Đã Sửa Lỗi Ghi Đè Dữ Liệu - Dùng Cache và Biến Môi Trường)
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ApplicationCommandOptionType, 
    PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Định nghĩa prefix
const prefix = 'l'; 

// ------------------------------------------------------------------
// ⭐ 1. KHỞI TẠO CLIENT VÀ TOKEN (ĐÃ DÙNG BIẾN MÔI TRƯỜNG CHO RENDER) ⭐
// ------------------------------------------------------------------
// ⭐ QUAN TRỌNG: DÒNG NÀY SẼ LẤY TOKEN TỪ THIẾT LẬP CỦA RENDER (BOT_TOKEN) ⭐
const TOKEN = process.env.BOT_TOKEN; 

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

// ------------------------------------------------------------------
// ⭐ 2. HỆ THỐNG KINH TẾ (BALANCE/DATABASE) - ĐÃ SỬA LỖI GHI ĐÈ ⭐
// ------------------------------------------------------------------

const userDataPath = path.resolve(__dirname, 'userData.json');
// ⭐ LƯU TRỮ DỮ LIỆU TẠM THỜI TRONG BỘ NHỚ (CACHE) ⭐
let userDataCache = {}; 

// Hàm đọc dữ liệu (CHỈ đọc khi khởi động)
const readUserData = () => {
    try {
        if (fs.existsSync(userDataPath)) {
            const data = fs.readFileSync(userDataPath, 'utf8');
            userDataCache = JSON.parse(data); // Cập nhật Cache
            return userDataCache;
        }
    } catch (error) {
        console.error("Lỗi khi đọc file userData.json:", error);
    }
    return {}; 
};

// Hàm ghi dữ liệu (Ghi từ Cache ra file)
const writeUserData = () => {
    try {
        // Ghi Cache ra file
        fs.writeFileSync(userDataPath, JSON.stringify(userDataCache, null, 4), 'utf8');
    } catch (error) {
        console.error("Lỗi khi ghi file userData.json:", error);
    }
};

// Hàm lấy dữ liệu người dùng (lấy từ Cache, có khởi tạo nếu chưa có)
const getUserData = (userId) => {
    // Đảm bảo cache đã được load nếu đây là lần đầu tiên gọi hàm
    if (Object.keys(userDataCache).length === 0 && fs.existsSync(userDataPath)) {
        readUserData();
    }

    if (!userDataCache[userId]) {
        userDataCache[userId] = {
            balance: 0,
            lastDaily: 0,
            lastWork: 0,
            lastCrime: 0,
            crimeMin: 50, // Mức phạt tối đa khi thất bại
            workMin: 100, // Mức thưởng tối đa khi làm việc
            crimeSuccessRate: 0.4 // 40% thành công
        };
        // Ghi lại nếu có người dùng mới được khởi tạo
        writeUserData(); 
    }
    // ⭐ LUÔN TRẢ VỀ THAM CHIẾU TỪ CACHE ⭐
    return userDataCache[userId];
};

// Hàm lấy số dư (lấy từ Cache)
const getBalance = (userId) => {
    return getUserData(userId).balance;
};

// Hàm thay đổi số dư (Áp dụng lên Cache và Ghi lại file)
const addBalance = (userId, amount) => {
    // Đảm bảo lấy được data từ cache (hoặc khởi tạo nếu chưa có)
    const user = getUserData(userId); 
    
    // Cập nhật số dư 
    user.balance = Math.max(0, (user.balance || 0) + amount); 

    // ⭐ GHI LẠI TOÀN BỘ CACHE RA FILE SAU KHI THAY ĐỔI ⭐
    writeUserData();
    
    return user.balance; // Trả về số dư mới
};

// ------------------------------------------------------------------
// ⭐ 3. HÀM XỬ LÝ SOCIAL COMMAND CHUNG ⭐
// ------------------------------------------------------------------

// Dữ liệu GIF cho các lệnh Social
const socialGifs = {
    'hug': [
        'https://media.giphy.com/media/GtkN9mPj4rGkQ/giphy.gif',
        'https://media.giphy.com/media/qS8P4zhc5D2jS/giphy.gif'
    ],
    'pat': [
        'https://media.giphy.com/media/tckXp3u8R4FqE/giphy.gif',
        'https://media.giphy.com/media/LgCWY9tG7lFkQ/giphy.gif'
    ],
    'kiss': [
        'https://media.giphy.com/media/2rkFh9tE3tKjM/giphy.gif',
        'https://media.giphy.com/media/j7Jp0N8N2j0g8/giphy.gif'
    ]
};

// Hàm xử lý chung
async function handleSocialCommand(interactionOrMessage, targetUser, action, type) {
    // Lấy user ID của người gửi (dùng cho cả message và interaction)
    const senderId = type === 'slash' ? interactionOrMessage.user.id : interactionOrMessage.author.id;
    const senderUsername = type === 'slash' ? interactionOrMessage.user.username : interactionOrMessage.author.username;
    
    // Không tương tác với bản thân
    if (targetUser.id === senderId) {
        if (type === 'slash') {
            return interactionOrMessage.reply({ content: `Bạn không thể ${action} chính mình.`, ephemeral: true });
        } else {
            return interactionOrMessage.reply(`Bạn không thể ${action} chính mình.`);
        }
    }
    
    // Lấy GIF ngẫu nhiên
    const gifs = socialGifs[action];
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
    
    // Tạo Embed
    const embed = new EmbedBuilder()
        .setColor('#FF69B4') // Màu hồng
        .setTitle(`💗 ${action.charAt(0).toUpperCase() + action.slice(1)}!`)
        .setDescription(`**${senderUsername}** đã ${action} **${targetUser.username}**!`)
        .setImage(randomGif)
        .setTimestamp();

    // Phản hồi dựa trên loại lệnh (Slash hay Prefix)
    await interactionOrMessage.reply({ embeds: [embed] });
}

// ------------------------------------------------------------------
// ⭐ 4. EVENT: KHI BOT ĐÃ ONLINE ⭐
// ------------------------------------------------------------------
client.on('ready', () => {
    console.log(`Bot đã online với tên: ${client.user.tag}`);
    client.user.setActivity('lhelp | /help');
    
    // ⭐ GỌI HÀM ĐỌC DỮ LIỆU BAN ĐẦU KHI BOT KHỞI ĐỘNG ⭐
    readUserData();
    console.log("✅ Đã đọc dữ liệu người dùng vào bộ nhớ (Cache).");
});


// ------------------------------------------------------------------
// ⭐ 5. EVENT: XỬ LÝ PREFIX COMMANDS (l!) ⭐
// ------------------------------------------------------------------
client.on('messageCreate', async (message) => {
    // Bỏ qua nếu tin nhắn từ bot khác hoặc không bắt đầu bằng prefix
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- Lệnh Ping ---
    if (command === 'ping') {
        message.reply(`Pong! Độ trễ: ${client.ws.ping}ms.`);
    }

    // --- Lệnh Social (hug, pat, kiss) ---
    if (['hug', 'pat', 'kiss'].includes(command)) {
        const target = message.mentions.users.first();
        if (!target) {
            return message.reply(`Vui lòng đề cập thành viên bạn muốn ${command}.`);
        }
        await handleSocialCommand(message, target, command, 'prefix');
    }

    // --- Lệnh Balance (Số dư) ---
    if (command === 'balance' || command === 'bal') {
        const target = message.mentions.users.first() || message.author;
        const balance = getBalance(target.id);
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`💰 Số Dư Xu Của ${target.username}`)
            .setDescription(`Số xu hiện tại của **${target.username}** là: **${balance}** xu.`)
            .setTimestamp();
            
        message.reply({ embeds: [embed] });
    }

    // --- Lệnh Daily ---
    if (command === 'daily') {
        const userId = message.author.id;
        const userData = getUserData(userId);
        const lastDaily = userData.lastDaily;
        
        // Cooldown 24 giờ (miliseconds)
        const dailyCooldown = 24 * 60 * 60 * 1000; 
        const timeSinceLastDaily = Date.now() - lastDaily;

        if (timeSinceLastDaily < dailyCooldown) {
            const timeLeft = dailyCooldown - timeSinceLastDaily;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            return message.reply(`⏰ Bạn đã nhận daily rồi. Vui lòng chờ **${hours} giờ** và **${minutes} phút** nữa.`);
        }

        // Thưởng ngẫu nhiên từ 500 đến 1000 xu
        const reward = Math.floor(Math.random() * 501) + 500; 
        const newBalance = addBalance(userId, reward);
        
        // ⭐ CẬP NHẬT THỜI GIAN VÀ GHI DATA ⭐
        userData.lastDaily = Date.now();
        writeUserData(); 
        
        message.reply(`🎉 Bạn đã nhận **${reward}** xu Daily! Số dư mới của bạn: **${newBalance}** xu.`);
    }
    
    // --- Lệnh Give ---
    if (command === 'give') {
        const recipient = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!recipient) {
            return message.reply('Vui lòng đề cập người bạn muốn tặng xu.');
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            return message.reply('Số xu tặng không hợp lệ. Vui lòng nhập số nguyên dương.');
        }

        const senderId = message.author.id;
        const senderBalance = getBalance(senderId);

        if (senderBalance < amount) {
            return message.reply('Bạn không có đủ xu để thực hiện giao dịch này.');
        }

        // Trừ tiền người gửi
        const newSenderBalance = addBalance(senderId, -amount);
        // Cộng tiền người nhận
        addBalance(recipient.id, amount); 

        message.reply(`✅ Bạn đã tặng **${amount}** xu cho **${recipient.username}**. Số dư của bạn: **${newSenderBalance}** xu.`);
    }

    // --- Lệnh Gamble (lgamble) ---
    if (command === 'gamble') {
        const amount = parseInt(args[0]);

        if (!amount || isNaN(amount) || amount <= 0) {
            return message.reply('Vui lòng nhập số tiền hợp lệ để cược. Ví dụ: lgamble 100');
        }
        
        const userBalance = getBalance(message.author.id);
        
        if (amount > userBalance) {
            return message.reply(`Số tiền cược phải không được vượt quá số dư (${userBalance} xu).`);
        }
        
        const processingMsg = await message.reply(`🎰 Đang quay số **${amount}** xu... Vui lòng chờ **5 giây**!`);

        // Chờ 5 giây
        await new Promise(resolve => setTimeout(resolve, 5000)); 

        const isWin = Math.random() < 0.5; // 50% thắng
        const userId = message.author.id;
        let resultMessage;
        let newBalance;

        if (isWin) {
            const earnedAmount = amount;
            newBalance = addBalance(userId, earnedAmount);
            resultMessage = `🎉 Chúc mừng, bạn đã thắng **${earnedAmount}** xu! Số dư mới: **${newBalance}** xu.`;
        } else {
            const lostAmount = amount;
            newBalance = addBalance(userId, -lostAmount);
            resultMessage = `😭 Rất tiếc, bạn đã thua **${lostAmount}** xu. Số dư mới: **${newBalance}** xu.`;
        }

        // Cập nhật tin nhắn
        await processingMsg.edit(resultMessage);
    }
    
});

// ------------------------------------------------------------------
// ⭐ 6. HÀM LẤY LEADERBOARD ⭐
// ------------------------------------------------------------------

async function getLeaderboard(guild) {
    // ⭐ ĐỌC DỮ LIỆU TỪ CACHE ⭐
    const userData = userDataCache; 
    const sortedUsers = Object.entries(userData)
        .sort(([, a], [, b]) => b.balance - a.balance)
        .slice(0, 10); // Lấy top 10

    if (sortedUsers.length === 0) {
        return "Chưa có ai trong bảng xếp hạng.";
    }

    let leaderboardText = '';
    for (let i = 0; i < sortedUsers.length; i++) {
        const [userId, data] = sortedUsers[i];
        
        let user;
        try {
            // Lấy thành viên từ guild
            user = await guild.members.fetch(userId);
        } catch (error) {
            // Bỏ qua nếu không tìm thấy thành viên trong guild
            continue; 
        }

        const username = user ? user.user.username : `Người dùng không tồn tại (${userId})`;
        
        // Thêm emoji cho top 3
        let emoji = '';
        if (i === 0) emoji = '🥇';
        else if (i === 1) emoji = '🥈';
        else if (i === 2) emoji = '🥉';
        else emoji = '🔹';

        leaderboardText += `${emoji} **${i + 1}. ${username}**: ${data.balance} xu\n`;
    }
    return leaderboardText;
}


// ------------------------------------------------------------------
// ⭐ 7. EVENT: XỬ LÝ SLASH COMMANDS (/) ⭐
// ------------------------------------------------------------------

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const userId = interaction.user.id;

    // --- Lệnh Ping ---
    if (commandName === 'ping') {
        await interaction.reply({ content: `Pong! Độ trễ: ${client.ws.ping}ms.`, ephemeral: true });
    }

    // --- Lệnh ServerInfo ---
    if (commandName === 'serverinfo') {
        const guild = interaction.guild;
        const serverEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Thông tin Server: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Chủ Server', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Số lượng thành viên', value: `${guild.memberCount}`, inline: true },
                { name: 'Ngày tạo', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:f>`, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [serverEmbed] });
    }
    
    // --- Lệnh Clear (Quản trị) ---
    if (commandName === 'clear') {
        const amount = interaction.options.getInteger('amount');
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: '❌ Bạn không có quyền xóa tin nhắn (Manage Messages).', ephemeral: true });
        }

        if (amount < 1 || amount > 99) {
            return interaction.reply({ content: 'Số lượng tin nhắn cần xóa phải từ 1 đến 99.', ephemeral: true });
        }

        try {
            await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({ content: `✅ Đã xóa thành công ${amount} tin nhắn.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Đã xảy ra lỗi khi cố gắng xóa tin nhắn.', ephemeral: true });
        }
    }

    // --- Lệnh Avatar ---
    if (commandName === 'avatar') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`Avatar của ${targetUser.username}`)
            .setImage(avatarURL)
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }

    // --- Lệnh Social (hug, pat, kiss) ---
    if (['hug', 'pat', 'kiss'].includes(commandName)) {
        const targetUser = interaction.options.getUser('user');
        await handleSocialCommand(interaction, targetUser, commandName, 'slash');
    }

    // --- Lệnh Balance (Số dư) ---
    if (commandName === 'balance') {
        const target = interaction.options.getUser('user') || interaction.user;
        const balance = getBalance(target.id);
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`💰 Số Dư Xu Của ${target.username}`)
            .setDescription(`Số xu hiện tại của **${target.username}** là: **${balance}** xu.`)
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
    
    // --- Lệnh Leaderboard ---
    if (commandName === 'leaderboard') {
        await interaction.deferReply(); // Hoãn phản hồi vì có thể mất thời gian
        const leaderboardText = await getLeaderboard(interaction.guild);
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('👑 Bảng Xếp Hạng Giàu Nhất')
            .setDescription(leaderboardText)
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
    }

    // --- Lệnh Daily ---
    if (commandName === 'daily') {
        const userData = getUserData(userId);
        const lastDaily = userData.lastDaily;
        
        // Cooldown 24 giờ
        const dailyCooldown = 24 * 60 * 60 * 1000; 
        const timeSinceLastDaily = Date.now() - lastDaily;

        if (timeSinceLastDaily < dailyCooldown) {
            const timeLeft = dailyCooldown - timeSinceLastDaily;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            return interaction.reply({ content: `⏰ Bạn đã nhận daily rồi. Vui lòng chờ **${hours} giờ** và **${minutes} phút** nữa.`, ephemeral: true });
        }

        // Thưởng ngẫu nhiên từ 500 đến 1000 xu
        const reward = Math.floor(Math.random() * 501) + 500; 
        const newBalance = addBalance(userId, reward);
        
        // ⭐ CẬP NHẬT THỜI GIAN VÀ GHI DATA ⭐
        userData.lastDaily = Date.now();
        writeUserData();
        
        await interaction.reply({ content: `🎉 Bạn đã nhận **${reward}** xu Daily! Số dư mới của bạn: **${newBalance}** xu.` });
    }

    // --- Lệnh Give ---
    if (commandName === 'give') {
        const recipient = interaction.options.getUser('recipient');
        const amount = interaction.options.getInteger('amount');

        if (amount <= 0) {
            return interaction.reply({ content: 'Số xu tặng phải là số nguyên dương.', ephemeral: true });
        }
        
        if (recipient.id === userId) {
            return interaction.reply({ content: 'Bạn không thể tự tặng xu cho chính mình.', ephemeral: true });
        }

        const senderBalance = getBalance(userId);

        if (senderBalance < amount) {
            return interaction.reply({ content: 'Bạn không có đủ xu để thực hiện giao dịch này.', ephemeral: true });
        }

        // Trừ tiền người gửi
        const newSenderBalance = addBalance(userId, -amount);
        // Cộng tiền người nhận
        addBalance(recipient.id, amount); 

        await interaction.reply({ content: `✅ Bạn đã tặng **${amount}** xu cho **${recipient.username}**. Số dư của bạn: **${newSenderBalance}** xu.` });
    }

    // --- Lệnh Gamble ---
    if (commandName === 'gamble') {
        const amount = interaction.options.getInteger('amount');

        const userBalance = getBalance(userId);
        
        if (amount > userBalance) {
            return interaction.reply({ content: `Số tiền cược phải không được vượt quá số dư (${userBalance} xu).`, ephemeral: true });
        }
        
        // Hoãn phản hồi
        await interaction.deferReply(); 

        // Chờ 5 giây (để mô phỏng quay số)
        await new Promise(resolve => setTimeout(resolve, 5000)); 

        const isWin = Math.random() < 0.5; // 50% thắng
        let resultMessage;
        let newBalance;

        if (isWin) {
            const earnedAmount = amount;
            newBalance = addBalance(userId, earnedAmount);
            resultMessage = `🎉 Chúc mừng, bạn đã thắng **${earnedAmount}** xu! Số dư mới: **${newBalance}** xu.`;
        } else {
            const lostAmount = amount;
            newBalance = addBalance(userId, -lostAmount);
            resultMessage = `😭 Rất tiếc, bạn đã thua **${lostAmount}** xu. Số dư mới: **${newBalance}** xu.`;
        }

        await interaction.editReply(resultMessage);
    }
    
    // ------------------------------------------------------------------
    // 16. Lệnh /Work
    // ------------------------------------------------------------------
    if (commandName === 'work') {
        const userData = getUserData(userId);
        const lastWork = userData.lastWork || 0;
        
        // Cooldown 4 giờ (miliseconds)
        const workCooldown = 4 * 60 * 60 * 1000; 
        const timeSinceLastWork = Date.now() - lastWork;

        if (timeSinceLastWork < workCooldown) {
            const timeLeft = workCooldown - timeSinceLastWork; 
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            return interaction.reply({ content: `⏰ Bạn đã làm việc rồi. Vui lòng chờ **${hours} giờ** và **${minutes} phút** nữa.`, ephemeral: true });
        }

        // Thưởng ngẫu nhiên từ 1 đến workMin (100) xu
        const reward = Math.floor(Math.random() * userData.workMin) + 1; 
        const newBalance = addBalance(userId, reward);
        
        // ⭐ CẬP NHẬT THỜI GIAN VÀ GHI DATA ⭐
        userData.lastWork = Date.now();
        writeUserData();
        
        await interaction.reply({ content: `💼 Bạn đã làm việc và kiếm được **${reward}** xu! Số dư mới của bạn: **${newBalance}** xu.` });
    }

    // ------------------------------------------------------------------
    // 17. Lệnh /Crime
    // ------------------------------------------------------------------
    if (commandName === 'crime') {
        const userData = getUserData(userId);
        const lastCrime = userData.lastCrime || 0;
        
        // Cooldown 6 giờ (miliseconds)
        const crimeCooldown = 6 * 60 * 60 * 1000; 
        const timeSinceLastCrime = Date.now() - lastCrime;

        if (timeSinceLastCrime < crimeCooldown) {
            const timeLeft = crimeCooldown - timeSinceLastCrime;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            return interaction.reply({ content: `🚨 Bạn đã phạm tội rồi. Vui lòng chờ **${hours} giờ** và **${minutes} phút** nữa.`, ephemeral: true });
        }
        
        // Tỉ lệ thành công (40%)
        const isSuccess = Math.random() < userData.crimeSuccessRate; 
        let resultMessage;
        
        // ⭐ CẬP NHẬT THỜI GIAN VÀ GHI DATA ⭐
        userData.lastCrime = Date.now();
        writeUserData();
        
        if (isSuccess) {
            // Thưởng ngẫu nhiên 500 đến 1000 xu
            const earnedAmount = Math.floor(Math.random() * 501) + 500; 
            const newBalance = addBalance(userId, earnedAmount);
            resultMessage = `✅ Bạn đã trộm thành công và kiếm được **${earnedAmount}** xu. Số dư mới: **${newBalance}** xu.`;
        } else {
            // Phạt ngẫu nhiên từ 1 đến crimeMin (50) xu
            const lostAmount = Math.floor(Math.random() * userData.crimeMin) + 1; 
            const newBalance = addBalance(userId, -lostAmount); // Mất tiền
            
            resultMessage = `❌ Bạn đã bị **bắt quả tang**! Bạn bị phạt và mất **${lostAmount}** xu. Số dư mới: **${newBalance}** xu.`;
        }
        
        await interaction.reply(resultMessage);
    }
    
}); 

// Kết nối bot
client.login(TOKEN);
