import dotenv from "dotenv";
import {
  get_lasts_messages_on_topic,
  get_name_of_stream_from_repository,
  get_topics_for_issues,
  post_message_on_topic,
} from "./zulip/request_zulip";
import {
  get_issue_by_number,
  get_issue_by_number_graphql,
  get_pull_requests_by_releases,
} from "./github/request_github";
import {
  clear_message_on_channel,
  connect_discord,
  create_channel_discord,
  get_channel_id_discord,
  get_channel_messages_discord,
  send_message_to_channel,
  send_typing_to_channel,
  update_message_discord,
} from "./discord/client_discord";
import moment from "moment";
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
  send_typing_to_channel(channel_id);
  const ophio = await get_closed_issues_from_repository("ophio");
  const rdb = await get_closed_issues_from_repository("resilio-db");

  const messages_collection = await get_channel_messages_discord(channel_id);
  const messages = messages_collection.reverse();

  let j = 0;
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.author.displayName !== "Resibot" || i > 1) {
      await message.delete();
    } else {
      j++;
      if (j == 1) {
        console.log(message.embeds[0].title);
        update_message_discord(channel_id, message.id, ...ophio);
      }
      if (j == 2) {
        console.log(message.embeds[0].title);
        update_message_discord(channel_id, message.id, ...rdb, "#59b9e8");
      }
    }
  }

  if (j < 2) {
    await clear_message_on_channel(channel_id);
    await send_message_to_channel(channel_id, ...ophio);
    await send_message_to_channel(channel_id, ...rdb, "#59b9e8");
  }
}

export function interval(
  weekDay: string,
  hour: number,
  minute: number,
  func: () => void,
) {
  return setInterval(() => {
    const m = moment().day(weekDay).hour(hour).minute(minute).second(0);
    const now = moment();
    if (!m.isSame(now, "second")) return;
    func();
  }, 1000);
}

export async function discord_send_message_for_meeting() {
  const channel_name = "announcement";
  const channel_id = await get_channel_id_discord(channel_name);
  if (channel_id === null || channel_id === "") return;
  send_typing_to_channel(channel_id);
  const title = "Meeting Reminder";
  const list = [
    "General Meeting will start in 10 minutes",
    "Please join the meeting",
  ];
  await send_message_to_channel(channel_id, title, list);
}

export async function check_closed_issues_by_releases(
  repository_name: string,
): Promise<void> {
  const releases = await get_pull_requests_by_releases(repository_name);
  // console.log(releases);
  const stream_name = get_name_of_stream_from_repository(repository_name);
  if (stream_name === undefined) return;

  const topics = await get_topics_for_issues(stream_name);
  for (const t of topics) {
    const topic_issues = await Promise.all(
      t.issues.map(
        async (i) => await get_issue_by_number_graphql(repository_name, i),
      ),
    );
    if (
      topic_issues.every(
        (i) => i === null || i.closedByPullRequestsReferences.nodes.length <= 0,
      )
    )
      continue;

    const close_topic = topic_issues.map((i) => {
      const c: Set<string> = new Set([]);
      if (i === null) return c;
      if (i.state !== "CLOSED") return c;
      for (const n of i.closedByPullRequestsReferences.nodes) {
        for (const r of releases) {
          if (r.pull_requests.includes(n.number)) {
            c.add(r.name);
            break;
          }
        }
      }
      return c;
    });
    for (const i of topic_issues) {
      if (i === null) continue;
      for (const n of i.closedByPullRequestsReferences.nodes) {
        for (const r of releases) {
          if (!r.pull_requests.includes(n.number)) continue;
        }
      }
    }
    if (close_topic.every((c) => c.size > 0)) {
      const messages = await get_lasts_messages_on_topic(stream_name, t.name);
      const rels = Array.from(
        new Set(close_topic.flatMap((c) => Array.from(c))),
      );
      if (
        messages.some((m) =>
          m.content.includes(`Resolved by release: ${rels.join(", ")}`),
        )
      )
        continue;
      post_message_on_topic(
        stream_name,
        t.name,
        `Resolved by release: ${rels.join(", ")}\nCheck that the issue is really resolved and close it.`,
      );
    }
  }
}

async function main() {
  create_server_webhook();
  await check_closed_issues_by_releases("ophio");
  discord_status().then().catch(console.error);
  // interval("Monday", 11, 20, discord_send_message_for_meeting);
}

try {
  main();
} catch (e) {
  console.error(e);
}
