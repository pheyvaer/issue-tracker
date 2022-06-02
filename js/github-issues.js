import {getAnnotationsForIssue} from "./annotations";

export async function getIssues(owner, repo) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?per_page=100&state=all`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

  const issues = await response.json();
  console.log(issues);
  return issues;
}

export async function convertIssuesToGridRecords(issues, solidFetch, storageLocationUrl) {
  const records = [];
  for (const issue of issues) {
    if (!issue.pull_request) {
      const {projects, dueDate, milestones} = await getAnnotationsForIssue(issue.url, solidFetch, storageLocationUrl);
      const record = {
        title: issue.title,
        assignee: issue.assignee ? issue.assignee.login : null,
        number: issue.number,
        state: getState(issue),
        type: getTypeOfIssue(issue),
        url: issue.url,
        labels: removeRedundantLabels(issue.labels),
        creator: issue.user.login,
        githubUrl: issue.html_url,
        projects,
        dueDate,
        milestones
      };

      records.push(record);
    }
  }

  return records;
}

function getTypeOfIssue(issue) {
  const labels = issue.labels;

  let i = 0;

  while (i < labels.length && labels[i].name !== 'challenge' && labels[i].name !== 'scenario') {
    i ++;
  }

  if (i < labels.length) {
    return labels[i].name;
  }
}

function removeRedundantLabels(labels) {
  labels = labels.map(label => label.name);
  return labels.filter(label => label !== 'challenge' && label !== 'scenario' && label !== 'completed');
}

function isCompleted(issue) {
  const labels = issue.labels.map(label => label.name);
  return labels.includes('completed');
}

function getState(issue) {
  if (isCompleted(issue)) {
    return 'Completed';
  } else {
    const {state} = issue;
    return state[0].toUpperCase() + state.substring(1);
  }
}
