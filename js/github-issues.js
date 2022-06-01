import {getAnnotationsForIssue} from "./annotations";

export async function getIssues(owner, repo) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`,
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
    const {projects, dueDate, milestones} = await getAnnotationsForIssue(issue.url, solidFetch, storageLocationUrl);
    const record = {
      title: issue.title,
      assignee: issue.assignee ? issue.assignee.login : null,
      state: issue.state,
      type: getTypeOfIssue(issue),
      url: issue.url,
      labels: removeTypeFromLabels(issue.labels),
      creator: issue.user.login,
      githubUrl: issue.html_url,
      projects,
      dueDate,
      milestones
    };

    records.push(record);
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

function removeTypeFromLabels(labels) {
  labels = labels.map(label => label.name);
  return labels.filter(label => label !== 'challenge' && label !== 'scenario');
}
