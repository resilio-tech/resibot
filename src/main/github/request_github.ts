import axios from "axios";
import { GITHUB_TOKEN } from "../config/env";

export interface Issue {
  id: number;
  node_id: string;
  number: number;
  title: string;
  state: string;
  labels: {
    name: string;
  }[];
}

function get_issues_from_github(repository_name: string): Promise<Issue[]> {
  return new Promise((resolve, reject) => {
    axios
      .get(
        `https://api.github.com/repos/resilio-tech/${repository_name}/issues?per_page=100`,
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

export async function get_issues_list(repository_name: string) {
  const issues: Issue[] = [];
  const r = await get_issues_from_github(repository_name);
  for (const i of r) {
    issues.push({
      id: i.id,
      node_id: i.node_id,
      number: i.number,
      title: i.title,
      state: i.state,
      labels: [],
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
        reject(error.response);
      });
  });
}

export async function get_issue_by_number_graphql(
  repository_name: string,
  issue_number: number,
): Promise<
  Issue & {
    closedByPullRequestsReferences: {
      nodes: {
        number: number;
      }[];
    };
  }
> {
  return new Promise((resolve, reject) => {
    axios
      .post(
        `https://api.github.com/graphql`,
        {
          query: `query {
            repository(owner: "resilio-tech", name: "${repository_name}") {
              issue(number: ${issue_number}) {
                id
                number
                title
                state
                closedByPullRequestsReferences(first: 100) {
                    nodes {
                        number
                    }
                }
              }
            }
          }`,
        },
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
          },
        },
      )
      .then((response) => {
        resolve(response.data.data.repository.issue);
      })
      .catch((error) => {
        reject(error);
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

export interface GithubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
}

export async function get_releases_from_repository(
  repository_name: string,
): Promise<GithubRelease[]> {
  return new Promise((resolve, reject) => {
    axios
      .get(
        `https://api.github.com/repos/resilio-tech/${repository_name}/releases`,
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

export interface Release {
  name: string;
  pull_requests: number[];
}

export async function get_pull_requests_by_releases(
  repository_name: string,
): Promise<Release[]> {
  const github_releases = await get_releases_from_repository(repository_name);
  const releases = [];
  for (const r of github_releases) {
    const regex = /\/pull\/(\d+)/gm;
    const matches = r.body
      .match(regex)
      ?.map((m) => parseInt(m.replace("/pull/", "")));

    if (!matches) continue;

    const release = {
      name: r.name,
      pull_requests: matches,
    };

    releases.push(release);
  }
  return releases;
}

export interface ProjectsQuery {
  organization: {
    projectsV2: {
      nodes: {
        id: string;
        createdAt: string;
        title: string;
        closed: boolean;
        items: {
          nodes: {
            type: string;
            content: {
              number: number;
            } | null;
            status: {
              name: string;
            } | null;
            estimated_size: {
              name: string;
            } | null;
            time_spent: {
              name: string;
            } | null;
            sprint: {
              title: string;
              startDate: string;
              duration: number;
            } | null;
          }[];
        };
      }[];
    };
  };
}

export async function get_last_projects(): Promise<ProjectsQuery> {
  const projects = await axios
    .post(
      "https://api.github.com/graphql",
      {
        query: `query {
        organization(login: "resilio-tech") {
          projectsV2(first: 20) {
            nodes {
              id
              createdAt
              title
              closed
              items {
                nodes {
                  type
                  content {
                    ... on Issue {
                      number
                    }
                    ... on PullRequest {
                      number
                    }
                  }
                  status: fieldValueByName(name: "Status") {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                    }
                  }
                  estimated_size: fieldValueByName(name: "Estimated size") {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                    }
                  }
                  time_spent: fieldValueByName(name: "Time spent") {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                    }
                  }
                  sprint: fieldValueByName(name: "Sprint") {
                    ... on ProjectV2ItemFieldIterationValue {
                      title
                      startDate
                      duration
                    }
                  }  
                }
              }
            }
          }
        }
      }`,
      },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
        },
      },
    )
    .catch((error) => {
      console.log(error.response.data);
      return error.response;
    });

  // console.log(JSON.stringify(projects.data.error, null, 2));
  // console.log(JSON.stringify(projects.data.data, null, 2));
  return projects.data.data;
}
