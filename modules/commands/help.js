/**
 * Help Command - Full List Only
 * No pagination, no page numbers, no boxes, no descriptions.
 * Just plain list of command names.
 */

module.exports = {
  config: {
    name: 'help',
    aliases: ['h', 'menu', 'Help', 'HELP'],
    description: 'Shows all commands',
    usage: '{prefix}help [command]',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 2,
    category: 'GENERAL'
  },

  run: async function ({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    const prefix = global.config.prefix;

    // Optional: detail for a single command
    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const command = global.client.commands.get(commandName) ||
        [...global.client.commands.values()].find(cmd =>
          cmd.config.aliases && cmd.config.aliases.includes(commandName)
        );

      if (!command) {
        return api.sendMessage(`❌ Command "${commandName}" not found.`, threadID, messageID);
      }

      const ok = await global.permissions.checkPermission(senderID, command.config.permission);
      if (!ok) {
        return api.sendMessage(`❌ You don't have permission to view this command.`, threadID, messageID);
      }

      const usage = command.config.usage?.replace('{prefix}', prefix) ||
        (command.config.hasPrefix === false
          ? command.config.name
          : `${prefix}${command.config.name}`);

      const lines = [
        `📌 ${command.config.name}`,
        `📝 ${command.config.description || 'No description'}`,
        `🔄 ${usage}`,
        `⏱️ ${command.config.cooldown || 5}s`,
        `🔒 ${command.config.permission || 'PUBLIC'}`,
        `📂 ${command.config.category || 'UNCATEGORIZED'}`
      ];
      if (command.config.aliases?.length) {
        lines.push(`🔗 ${command.config.aliases.map(a => prefix + a).join(', ')}`);
      }

      return api.sendMessage(lines.join('\n'), threadID, messageID);
    }

    // Build permitted list
    const all = [...new Set(global.client.commands.values())];
    const permitted = [];
    for (const cmd of all) {
      const ok = await global.permissions.checkPermission(senderID, cmd.config.permission || 'PUBLIC');
      if (ok) permitted.push(cmd);
    }
    permitted.sort((a, b) => a.config.name.localeCompare(b.config.name));

    const fmt = cmd => cmd.config.hasPrefix === false
      ? cmd.config.name
      : `${prefix}${cmd.config.name}`;

    const text = permitted.map(fmt).join('\n');

    return sendChunked(api, threadID, text, messageID);
  },

  handleReply: async function () {}
};

/**
 * Send long text in chunks (Messenger ~2000 char limit)
 */
async function sendChunked(api, threadID, text, messageID) {
  const LIMIT = 1900;
  if (text.length <= LIMIT) {
    return api.sendMessage(text, threadID, messageID);
  }
  const lines = text.split('\n');
  let buf = '';
  const chunks = [];
  for (const line of lines) {
    if ((buf + line + '\n').length > LIMIT) {
      chunks.push(buf);
      buf = '';
    }
    buf += line + '\n';
  }
  if (buf) chunks.push(buf);

  for (let i = 0; i < chunks.length; i++) {
    await api.sendMessage(chunks[i], threadID, i === 0 ? messageID : undefined);
  }
}