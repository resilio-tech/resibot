import dotenv from "dotenv";

dotenv.config();

export const {
  ZULIP_API_KEY,
  ZULIP_EMAIL,
  ZULIP_SERVER_URL,
  GITHUB_TOKEN,
  GITHUB_WEBHOOK_SECRET,
  DISCORD_TOKEN,
} = process.env;
