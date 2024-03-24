import {
  Client,
  ColorResolvable,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
} from "discord.js";
import { DISCORD_TOKEN } from "../config/env";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

export function connect_discord(): Promise<void> {
  return new Promise((resolve) => {
    client.once(Events.ClientReady, (readyClient) => {
      console.log(`Ready! Logged in as ${readyClient.user?.tag}`);
      resolve();
    });

    client.login(DISCORD_TOKEN);
  });
}

export function get_discord_client() {
  return client;
}

export async function get_channel_id_discord(channel_name: string) {
  const guilds = await client.guilds.fetch();
  const oauth_guild = guilds.first();
  const guild = await oauth_guild?.fetch();
  if (!guild) {
    return null;
  }
  const channel = guild.channels.cache.find(
    (c) => c.name === channel_name && c.type === 0,
  );
  if (channel) {
    return channel.id;
  }
  return null;
}

export async function create_channel_discord(channel_name: string) {
  const guilds = await client.guilds.fetch();
  const oauth_guild = guilds.first();
  const guild = await oauth_guild?.fetch();
  if (!guild) {
    return null;
  }
  const category = (await guild).channels.cache.find(
    (c) => c.type === 4 && c.name === "💼 --- Work Orga --- 💼",
  );
  if (!category) {
    return null;
  }
  const channel = await guild.channels.create({
    name: channel_name,
    type: 0,
    parent: category?.id,
  });
  return channel.id;
}

export async function clear_message_on_channel(channel_id: string) {
  const channel = await client.channels.fetch(channel_id);
  if (!channel || channel.type !== 0) {
    return;
  }
  const messages = await channel.messages.fetch();
  for (const [, message] of messages) {
    await message.delete();
  }
}

export async function send_typing_to_channel(
  channel_id: string,
): Promise<void> {
  const channel = await client.channels.fetch(channel_id);
  if (!channel || channel.type !== 0) {
    return;
  }
  await channel.sendTyping();
}

export async function send_message_to_channel(
  channel_id: string,
  title: string,
  list: string[],
  color: ColorResolvable = "#339d68",
) {
  const channel = await client.channels.fetch(channel_id);
  if (!channel || channel.type !== 0) {
    return;
  }
  const message = new EmbedBuilder()
    .setTitle(title)
    .setDescription(list.join("\n"))
    .setColor(color)
    .setTimestamp();
  await channel.send({ embeds: [message] });
}
