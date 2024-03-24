import dotenv from "dotenv";
import {
  get_name_of_stream_from_repository,
  get_topics_for_issues,
} from "./zulip/request_zulip";
import { get_issue_by_number } from "./github/request_github";
import {
  clear_message_on_channel,
  connect_discord,
  create_channel_discord,
  get_channel_id_discord,
  send_message_to_channel,
  send_typing_to_channel,
} from "./discord/client_discord";
import { create_server_webhook } from "./github/webhook_github";

dotenv.config();

export async function check_closed_issues(
  repository_name: string,
): Promise<string[]> {
  const stream_name = get_name_of_stream_from_repository(repository_name);
  if (stream_name === undefined) {
    return [];
  }
  const texts: string[] = [];
  const topics = await get_topics_for_issues(stream_name);
  for (const t of topics) {
    const topic_issues = await Promise.all(
      t.issues.map(async (i) => await get_issue_by_number(repository_name, i)),
    );
    t.related_issues = topic_issues;
    if (topic_issues.every((i) => i.state === "closed")) {
      const text = "Topic should be resolved: " + t.name;
      console.log(text);
      texts.push(text);
    }
  }

  for (const t of topics) {
    if (
      t.related_issues &&
      !t.related_issues.every((i) => i.state === "closed")
    ) {
      const text = "Topic remains unresolved: " + t.name;
      console.log(text);
      texts.push(text);
    }
  }

  return texts;
}

export async function get_closed_issues_from_repository(
  repository_name: string,
): Promise<[string, string[]]> {
  const texts = await check_closed_issues(repository_name);
  const should_resolved = texts
    .filter((t) => t.includes("Topic should be resolved"))
    .map((t) => t.replace("Topic should be resolved: ", "- "));
  const remains_unresolved = texts
    .filter((t) => t.includes("Topic remains unresolved"))
    .map((t) => t.replace("Topic remains unresolved: ", "- "));
  const title = `**Current Zulip Support Issues Status Opened for "${repository_name}"**`;
  const list = [
    `**Should be resolved Issues:** *${should_resolved.length}*`,
    ...should_resolved,
    `**Unresolved Issues:** *${remains_unresolved.length}*`,
    ...remains_unresolved,
  ];
  return [title, list];
}

export async function discord_status() {
  const channel_name = "issues-support";
  await connect_discord();
  let channel_id = await get_channel_id_discord(channel_name);
  if (channel_id === null || channel_id === "") {
    channel_id = await create_channel_discord(channel_name);
  }
  if (channel_id === null || channel_id === "") {
    throw new Error("Could not create channel");
  }
  await clear_message_on_channel(channel_id);
  send_typing_to_channel(channel_id);
  const ophio = await get_closed_issues_from_repository("ophio");
  await send_message_to_channel(channel_id, ...ophio);
  const rdb = await get_closed_issues_from_repository("resilio-db");
  await send_message_to_channel(channel_id, ...rdb, "#59b9e8");
}

function main() {
  create_server_webhook();
  discord_status().then().catch(console.error);
}

try {
  main();
} catch (e) {
  console.error(e);
}
