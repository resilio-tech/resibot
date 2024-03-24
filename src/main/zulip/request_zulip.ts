import axios from "axios";
import { ZULIP_API_KEY, ZULIP_EMAIL, ZULIP_SERVER_URL } from "../config/env";
import { Issue } from "../github/request_github";

export function get_user_zulip<T>() {
  axios
    .get<T>(`${ZULIP_SERVER_URL}/api/v1/users/me`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${ZULIP_EMAIL}:${ZULIP_API_KEY}`).toString("base64")}`,
      },
    })
    .then((response) => {
      console.log(response.data);
    });
}

export function get_all_streams_zulip() {
  return new Promise((resolve, reject) => {
    axios
      .get(`${ZULIP_SERVER_URL}/api/v1/streams`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${ZULIP_EMAIL}:${ZULIP_API_KEY}`).toString("base64")}`,
        },
      })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        reject(error.response.data);
      });
  });
}

export function get_stream_id_zulip(stream_name: string): Promise<number> {
  return new Promise((resolve, reject) => {
    axios
      .get(`${ZULIP_SERVER_URL}/api/v1/get_stream_id`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${ZULIP_EMAIL}:${ZULIP_API_KEY}`).toString("base64")}`,
        },
        params: {
          stream: stream_name,
        },
      })
      .then((response) => {
        resolve(response.data.stream_id);
      })
      .catch((error) => {
        reject(error.response.data);
      });
  });
}

export function get_all_topics_zulip(
  stream_id: number,
): Promise<{ name: string; max_id: number }[]> {
  return new Promise((resolve, reject) => {
    axios
      .get(`${ZULIP_SERVER_URL}/api/v1/users/me/${stream_id}/topics`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${ZULIP_EMAIL}:${ZULIP_API_KEY}`).toString("base64")}`,
        },
      })
      .then((response) => {
        resolve(response.data.topics);
      })
      .catch((error) => {
        reject(error.response.data);
      });
  });
}

export interface Topic {
  name: string;
  issues: number[];
  related_issues?: Issue[];
}

export function get_name_of_stream_from_repository(repository_name: string) {
  if (repository_name === "ophio") {
    return "61_support_ophio";
  }
  if (repository_name === "resilio-db") {
    return "64_support_resilioDB";
  }
}

export async function get_topics_for_issues(
  stream_name: string,
): Promise<Topic[]> {
  if (stream_name === undefined) {
    return [];
  }
  const a: Topic[] = [];
  const stream_id = await get_stream_id_zulip(stream_name);
  const topics = await get_all_topics_zulip(stream_id);
  for (const topic of topics) {
    const resolved_matches = topic.name.match(/^✔\s/);
    if (resolved_matches) {
      continue;
    }
    const matches = topic.name.match(/#(\d+)/g);
    if (matches) {
      a.push({
        name: topic.name,
        issues: matches.map((match) => parseInt(match.substring(1))),
      });
    }
  }
  return a;
}

export async function mark_as_resolved_zulip(
  stream_name: string,
  topic_name: string,
) {
  const message = await axios.get(`${ZULIP_SERVER_URL}/api/v1/messages`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${ZULIP_EMAIL}:${ZULIP_API_KEY}`).toString("base64")}`,
    },
    params: {
      num_after: 0,
      num_before: 1000,
      narrow: JSON.stringify([{ operator: "topic", operand: topic_name }]),
      anchor: "newest",
    },
  });
  const messages = message.data.messages;

  update_topic_name(messages[0].id, `✔ ${topic_name}`).then();
}

export async function update_topic_name(
  message_id: number,
  new_topic_name: string,
) {
  const params = new URLSearchParams({
    topic: new_topic_name,
    send_notification_to_old_thread: "false",
    send_notification_to_new_thread: "false",
    propagate_mode: "change_all",
  });
  await axios.patch(
    `${ZULIP_SERVER_URL}/api/v1/messages/${message_id}`,
    params.toString(),
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${ZULIP_EMAIL}:${ZULIP_API_KEY}`).toString("base64")}`,
      },
    },
  );
}
