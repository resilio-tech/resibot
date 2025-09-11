import { get_topic_owner } from "../../main/zulip/request_zulip";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const stream = "";
  const topic = "#4697 : maturité - result";
  const message = await get_topic_owner(stream, topic);
  console.log(message.sender_full_name);
}

main();
