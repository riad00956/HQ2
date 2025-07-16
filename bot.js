require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8000;

// Render-এর জন্য অ্যাপ লাইভ রাখা
app.get("/", (req, res) => {
  res.send("🚀 Telegram Video Enhancer Bot is running.");
});
app.listen(PORT, () => {
  console.log(`✅ Server is live on port ${PORT}`);
});

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "👋 স্বাগতম! আপনি একটি ভিডিও পাঠান, আমি সেটিকে HD-তে রূপান্তর করব।");
});

bot.on('video', async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.video.file_id;

  bot.sendMessage(chatId, "⏳ ভিডিও ডাউনলোড হচ্ছে...");

  try {
    const fileLink = await bot.getFileLink(fileId);
    const videoPath = path.join(__dirname, 'input.mp4');

    const videoWriter = fs.createWriteStream(videoPath);
    const response = await axios.get(fileLink, { responseType: 'stream' });
    response.data.pipe(videoWriter);

    videoWriter.on('finish', async () => {
      bot.sendMessage(chatId, "🚀 ভিডিও প্রসেস হচ্ছে...");

      const formData = new FormData();
      formData.append('media_file', fs.createReadStream(videoPath));

      const apiResponse = await axios.post(
        'https://yce.perfectcorp.com/api/v1/video-enhancement/enhance',
        formData,
        {
          headers: {
            'x-api-key': process.env.PERFECT_API_KEY,
            ...formData.getHeaders()
          }
        }
      );

      const enhancedUrl = apiResponse.data?.data?.output_video_url;

      if (enhancedUrl) {
        bot.sendMessage(chatId, "✅ ইনহান্সড ভিডিও প্রস্তুত!");
        bot.sendVideo(chatId, enhancedUrl);
      } else {
        bot.sendMessage(chatId, "❌ ভিডিও ইনহান্স করতে ব্যর্থ।");
      }

      fs.unlinkSync(videoPath);
    });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "⚠️ কোনো সমস্যা হয়েছে ভিডিও প্রসেসিং এ। আবার চেষ্টা করুন।");
  }
});
