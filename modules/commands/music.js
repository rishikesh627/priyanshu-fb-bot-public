const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");
const ytdl = require("@distube/ytdl-core");

module.exports.config = {
    name: "music",
    aliases: ["yt", "ytmusic", "song"],
    version: "2.0.0",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: "Download music from YouTube (No API Key needed)",
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
    let videoTitle = "Unknown Title";
    let searchingMessageInfo = null;

    try {
        // Check if input is a URL
        const isUrl = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)(\/|$)/.test(input);

        if (!isUrl) {
            // Search song by name
            searchingMessageInfo = await api.sendMessage(`🔍 Searching for: ${input}...`, threadID, messageID);
            const searchResult = await ytSearch(input);
            
            if (!searchResult || !searchResult.videos.length) {
                if (searchingMessageInfo) api.unsendMessage(searchingMessageInfo.messageID);
                return api.sendMessage("❌ Song not found on YouTube.", threadID, messageID);
            }
            
            const video = searchResult.videos[0];
            videoUrl = video.url;
            videoTitle = video.title;
        } else {
            // It's a URL
            searchingMessageInfo = await api.sendMessage(`🔍 Processing URL...`, threadID, messageID);
        }

        // Get Video Info
        const info = await ytdl.getInfo(videoUrl);
        videoTitle = info.videoDetails.title;
        const duration = info.videoDetails.lengthSeconds;

        // Send Info Message
        api.sendMessage(`🎵 Title: ${videoTitle}\n⏱ Duration: ${Math.floor(duration / 60)}m ${duration % 60}s\n⏳ Downloading audio...`, threadID, (err) => {
            if (!err && searchingMessageInfo) {
                api.unsendMessage(searchingMessageInfo.messageID);
            }
        });

        // Create temp directory
        const tempDir = path.join(__dirname, "tempsr");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Create safe filename
        const safeFilename = `music_${Date.now()}.mp3`;
        const filePath = path.join(tempDir, safeFilename);

        // Download audio
        const stream = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' });
        const writer = fs.createWriteStream(filePath);
        
        stream.pipe(writer);

        writer.on("finish", () => {
            fs.stat(filePath, (statErr, stats) => {
                if (statErr || !stats || stats.size === 0) {
                    api.sendMessage("❌ Download failed (empty file). Try another song.", threadID, messageID);
                    return fs.unlink(filePath, () => { });
                }

                // Send Audio File
                api.sendMessage(
                    {
                        body: `🎧 ${videoTitle}`,
                        attachment: fs.createReadStream(filePath),
                    },
                    threadID,
                    (err) => {
                        if (err) {
                            console.error("Error sending file:", err);
                            api.sendMessage("❌ Failed to send audio file.", threadID, messageID);
                        }
                        // Delete file after sending
                        fs.unlink(filePath, () => { });
                    }
                );
            });
        });

        writer.on("error", (err) => {
            console.error("Error downloading file:", err);
            api.sendMessage("❌ Failed to download the file.", threadID, messageID);
            fs.unlink(filePath, () => { });
        });

    } catch (error) {
        console.error("Error in music command:", error);
        if (searchingMessageInfo) api.unsendMessage(searchingMessageInfo.messageID);
        api.sendMessage("❌ An error occurred. YouTube might be blocking the request. Try again later.", threadID, messageID);
    }
};