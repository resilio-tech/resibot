import express from "express";
import { Issue } from "./request_github";
import {
  get_name_of_stream_from_repository,
  get_topics_for_issues,
  mark_as_resolved_zulip,
} from "../zulip/request_zulip";
import { verifySecret } from "verify-github-webhook-secret/target/src";
import { GITHUB_WEBHOOK_SECRET } from "../config/env";

export interface GithubWebhookIssue {
  action: string;
  issue: Issue;
}

export async function when_issue_closed(repository_name: string, issue: Issue) {
  const channel_name = get_name_of_stream_from_repository(repository_name);
  if (channel_name === undefined) {
    return;
  }
  const all_topics = await get_topics_for_issues(channel_name);
  const topics = all_topics.filter((t) => t.issues.includes(issue.number));
  console.log(
    `Issue ${issue.number} was closed; topic: ${topics.length > 0 ? topics.map((t) => t.name).join("; ") : "not found"}`,
  );
  for (const topic of topics) {
    mark_as_resolved_zulip(channel_name, topic.name);
  }
}

export function create_server_webhook() {
  const app = express();
  const port = 3001;

  app.use(express.json());

  app.post("/", async (req, res) => {
    if (
      !(await verifySecret(
        JSON.stringify(req.body),
        GITHUB_WEBHOOK_SECRET ?? "",
        req.headers["x-hub-signature"],
      ))
    ) {
      res.status(401).send("Unauthorized");
      return;
    }
    res.send("OK");

    const repository_name = req.body.repository.name;

    const webhook_issue = req.body as GithubWebhookIssue;
    if (webhook_issue.action === "closed") {
      when_issue_closed(repository_name, webhook_issue.issue);
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
