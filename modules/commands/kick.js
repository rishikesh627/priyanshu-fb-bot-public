/**
 * Kick Command
 * Removes a user from a group chat
 */

module.exports = {
  config: {
    name: 'kick',
    aliases: ['remove', 'kickuser'],
    description: 'Removes a user from the current group chat',
    usage: '{prefix}kick <@mention> या Reply',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'GROUP',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 5
  },

  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID, mentions } = message;

    // Check if user has admin permission
    const isAdmin = await global.permissions.checkPermission(senderID, 'ADMIN');
    if (!isAdmin) {
      return api.sendMessage('❌ You need ADMIN permission to use this command.', threadID, messageID);
    }

    // Check if this is a group chat
    const threadInfo = await api.getThreadInfo(threadID);
    if (!threadInfo.isGroup) {
      return api.sendMessage('❌ This command can only be used in group chats.', threadID, messageID);
    }

    let userIDToKick;
    let userName = "User";

    // चेक करो कि मेंशन है या रिप्लाई है
    if (Object.keys(mentions).length > 0) {
      userIDToKick = Object.keys(mentions)[0];
      userName = mentions[userIDToKick].replace('@', '');
    } else if (message.messageReply) {
      // अगर मेंशन नहीं है, तो रिप्लाई चेक करो
      userIDToKick = message.messageReply.senderID;
      userName = message.messageReply.senderName || "User";
    } else {
      return api.sendMessage(
        '❌ कृपया यूजर को मेंशन करें या उनके मैसेज पर रिप्लाई करें।\n' +
        'Usage: {prefix}kick @username',
        threadID, messageID
      );
    }

    // Check if trying to kick the bot itself
    if (userIDToKick === api.getCurrentUserID()) {
      return api.sendMessage('❌ I cannot kick myself from the group.', threadID, messageID);
    }

    // Check if trying to kick an admin
    const isTargetAdmin = threadInfo.adminIDs && threadInfo.adminIDs.some(admin => {
      const adminID = typeof admin === 'string' ? admin : admin.id;
      return adminID === userIDToKick;
    });
    
    if (isTargetAdmin) {
      return api.sendMessage('❌ Cannot kick an admin from the group.', threadID, messageID);
    }

    // Try to remove the user from the group
    try {
      api.sendMessage(`⏳ Removing ${userName} from the group...`, threadID, messageID);

      // Modern FCA (Promise based) removal
      api.removeUserFromGroup(userIDToKick, threadID, async (err) => {
        if (err) {
          global.logger.error('Error removing user from group:', err);
          return api.sendMessage(
            '❌ Failed to remove user from the group. Possible reasons:\n' +
            '- Bot is not an admin of the group\n' +
            '- User is not in the group\n' +
            '- Facebook is restricting this action',
            threadID, messageID
          );
        }

        // Success message
        api.sendMessage(`✅ Successfully removed ${userName} from the group.`, threadID);

        // Update thread in database using thread controller
        try {
          await global.controllers.thread.removeUserFromThread(threadID, userIDToKick);
          global.logger.database(`Removed user ${userName} (${userIDToKick}) from thread ${threadID} using thread controller`);
        } catch (dbError) {
          global.logger.error(`Error updating database after removing user from group:`, dbError.message);
        }
      });
    } catch (error) {
      global.logger.error('Error in kick command:', error);
      return api.sendMessage('❌ An error occurred while executing the command.', threadID, messageID);
    }
  }
};