import axios from "axios";
import { GITHUB_TOKEN } from "../config/env";

export interface Issue {
  id: number;
  node_id: string;
  number: number;
  title: string;
  state: string;
}

function get_issues_from_github(): Promise<Issue[]> {
  return new Promise((resolve, reject) => {
    axios
      .get("https://api.github.com/repos/resilio-tech/ophio/issues", {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
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

export async function get_issues_list() {
  // const topics = await get_topics_for_issues();
  // console.log(topics);
  const issues: Issue[] = [];
  const r = await get_issues_from_github();
  for (const i of r) {
    issues.push({
      id: i.id,
      node_id: i.node_id,
      number: i.number,
      title: i.title,
      state: i.state,
    });
  }
  return issues;
}

export async function get_issue_by_number(
  repository_name: string,
  issue_number: number,
): Promise<Issue> {
  return new Promise((resolve, reject) => {
    axios
      .get(
        `https://api.github.com/repos/resilio-tech/${repository_name}/issues/${issue_number}`,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
          },
        },
      )
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        reject(error.response.data);
      });
  });
}

export async function create_issue_comment(
  repository_name: string,
  issue_id: number,
  body: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    axios
      .post(
        `https://api.github.com/repos/resilio-tech/${repository_name}/issues/${issue_id}/comments`,
        {
          body: body,
        },
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
          },
        },
      )
      .then(() => {
        resolve();
      })
      .catch((error) => {
        reject(error.response.data);
      });
  });
}
