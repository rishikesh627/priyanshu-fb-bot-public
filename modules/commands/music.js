const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ytSearch = require("yt-search");

module.exports.config = {
    name: "music",
    aliases: ["yt", "ytmusic", "song"],
    version: "3.5.0",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: "Download music from YouTube (No Install Needed)",
    hasPrefix: true,
    permission: 'PUBLIC',
    category: "MEDIA",
    usages: "[url/song name]",
    cooldown: 5,
};

module.exports.run = async function ({ api, message, args }) {
    const { threadID, messageID } = message;

    if (!args.length) {
        return api.sendMessage("❌ Please enter a song name or YouTube URL.", threadID, messageID);
    }

    const input = args.join(" ");
    let videoUrl = input;
    let searchingMessageInfo = null;

    try {
        const isUrl = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)(\/|$)/.test(input);

        if (!isUrl) {
            searchingMessageInfo = await api.sendMessage(`🔍 Searching for: ${input}...`, threadID, messageID);
            const searchResult = await ytSearch(input);
            
            if (!searchResult || !searchResult.videos.length) {
                if (searchingMessageInfo) api.unsendMessage(searchingMessageInfo.messageID);
                return api.sendMessage("❌ Song not found on YouTube.", threadID, messageID);
            }
            videoUrl = searchResult.videos[0].url;
        } else {
            searchingMessageInfo = await api.sendMessage(`🔍 Processing URL...`, threadID, messageID);
        }

        // Free API 1 (sabse reliable free endpoint)
        let apiUrl = `https://api.nexoracle.com/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`;
        let response;

        try {
            response = await axios.get(apiUrl, { timeout: 15000 });
        } catch (e) {
            // Backup API 2 agar pehli fail ho
            apiUrl = `https://api.yanzbotz.my.id/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`;
            response = await axios.get(apiUrl, { timeout: 15000 });
        }

        const data = response.data;

        // Check response structure (yeh free APIs alag alag format me data deti hain)
        let downloadUrl = null;
        let title = "Unknown Title";

        if (data && data.status && data.result) {
            downloadUrl = data.result.url || data.result.download || data.result.link;
            title = data.result.title || title;
        } else if (data && data.result) {
            downloadUrl = data.result.url || data.result.download || data.result.link;
            title = data.result.title || title;
        } else if (data && data.url) {
            downloadUrl = data.url;
            title = data.title || title;
        }

        if (!downloadUrl) {
            if (searchingMessageInfo) api.unsendMessage(searchingMessageInfo.messageID);
            return api.sendMessage("❌ Failed to generate download link. Both APIs failed. Please try again later.", threadID, messageID);
        }

        // Temp directory setup
        const tempDir = path.join(__dirname, "tempsr");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const filePath = path.join(tempDir, `music_${Date.now()}.mp3`);

        // Info message
        api.sendMessage(`🎵 Title: ${title}\n⏳ Downloading...`, threadID, () => {
            if (searchingMessageInfo) api.unsendMessage(searchingMessageInfo.messageID);
        });

        // Download file
        const writer = fs.createWriteStream(filePath);
        const downloadResponse = await axios({
            method: "GET",
            url: downloadUrl,
            responseType: "stream",
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 30000
        });

        downloadResponse.data.pipe(writer);

        writer.on("finish", () => {
            fs.stat(filePath, (statErr, stats) => {
                if (statErr || !stats || stats.size === 0) {
                    api.sendMessage("❌ Download failed (empty file).", threadID, messageID);
                    return fs.unlink(filePath, () => { });
                }

                api.sendMessage(
                    {
                        body: `🎧 ${title}`,
                        attachment: fs.createReadStream(filePath),
                    },
                    threadID,
                    (err) => {
                        if (err) {
                            console.error("Send Error:", err);
                            api.sendMessage("❌ Failed to send audio file.", threadID, messageID);
                        }
                        fs.unlink(filePath, () => { });
                    }
                );
            });
        });

        writer.on("error", (err) => {
            console.error("Download Error:", err);
            api.sendMessage("❌ Failed to download the file.", threadID, messageID);
            fs.unlink(filePath, () => { });
        });

    } catch (error) {
        console.error("Music Command Error:", error.message);
        if (searchingMessageInfo) api.unsendMessage(searchingMessageInfo.messageID);
        api.sendMessage("❌ An error occurred. APIs might be down, please try again.", threadID, messageID);
    }
};