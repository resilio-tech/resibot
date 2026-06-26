import { get_topic_owner } from "../../main/zulip/request_zulip";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const stream = "61_support_ophio";
  const topic = "#5945 - Select a domain";
  const message = await get_topic_owner(stream, topic);
  console.log(message?.sender_full_name ?? "no owner found");
}

main();
