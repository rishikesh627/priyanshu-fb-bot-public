/**
 * Unsend Command
 * Unsends a message when replied to (works with 'uns', 'unsend', 'delete')
 */

module.exports = {
  config: {
    name: 'unsend',
    aliases: ['uns', 'delete', 'del', 'unsend'],
    description: 'Unsends a replied message',
    usage: '{prefix}uns (reply to any message)',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ADMIN',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 3
  },

  run: async function({ api, message, args }) {
    const { threadID, messageID, messageReply } = message;
    const logger = global.logger ?? console;

    try {
      // Reply zaroori hai
      if (!messageReply) {
        return api.sendMessage(
          '❌ Jis message ko unsend karna hai, us par reply karke `uns` likho.',
          threadID,
          messageID
        );
      }

      const botID = api.getCurrentUserID();

      // Bot apna message delete kar sakta hai
      // Bot admin ho to kisi ka bhi message delete kar sakta hai (agar API allow kare)
      const isBotMessage = messageReply.senderID === botID;

      if (!isBotMessage) {
        // Non-bot message: sirf tab try karo jab bot admin ho
        // (Facebook API generally sirf apne messages unsend kar sakta hai)
        return api.sendMessage(
          '❌ Main sirf apne (bot ke) messages unsend kar sakta hoon. Kisi aur ka message delete karne ke liye group admin hona + Facebook ki permission chahiye hoti hai.',
          threadID,
          messageID
        );
      }

      let replied = false;
      api.unsendMessage(messageReply.messageID, (err) => {
        if (replied) return;
        replied = true;

        if (err) {
          logger.error('Error unsending message:', err);
          return api.sendMessage(
            '❌ Message unsend nahi ho paya. Ho sakta hai wo 10 minute se purana ho ya permission issue ho.',
            threadID,
            messageID
          );
        }
        // Success par chup raho (clean UX)
      });

    } catch (error) {
      logger.error('Error in unsend command:', error.message);
      return api.sendMessage('❌ Kuch galat ho gaya.', threadID, messageID);
    }
  }
};