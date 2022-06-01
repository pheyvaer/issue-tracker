import {getRDFasJson} from "./utils";

const baseUrls = {
  projects: 'https://data.knows.idlab.ugent.be/project/',
  milestones: 'https://data.knows.idlab.ugent.be/milestone/'
};

export async function getAnnotationsForIssue(issueUrl, solidFetch, storageLocationUrl) {
  const frame = {
    "@context": {
      "@vocab": "https://data.knows.idlab.ugent.be/person/office/#",
      "relatedProject": {"@type": "@id"},
      "milestone": {"@type": "@id"},
    },
    "@id": issueUrl
  };

  const data = await getRDFasJson(storageLocationUrl, frame, solidFetch);
  console.log(data);

  data.relatedProject = collapseUrls(':', baseUrls.projects, assureArray(data.relatedProject));
  data.milestone = collapseUrls(':', baseUrls.milestones, assureArray(data.milestone));

  return {projects: data.relatedProject,  milestones: data.milestone, dueDate: data.dueDate}
}

export async function updateAnnotationsForIssue(options) {
  let {issueUrl, field, data, oldValue, solidFetch, storageLocationUrl} = options;

  if (field === 'projects' || field === 'milestones') {
    data = data.split(',');
    data = expandUrls(':', baseUrls[field], data);
    data = data.filter(a => a !== '');
    console.log(data);
  } else if (field === 'dueDate') {
    // Remove old due date
    await solidFetch(storageLocationUrl,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/sparql-update'
        },
        body: `DELETE DATA {<${issueUrl}> <https://data.knows.idlab.ugent.be/person/office/#dueDate> "${oldValue}"}`
      });
    // Add new due date
    await solidFetch(storageLocationUrl,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/sparql-update'
        },
        body: `INSERT DATA {<${issueUrl}> <https://data.knows.idlab.ugent.be/person/office/#dueDate> "${data}"}`
      });
  }


  // Delete removed data
  // 1. Get current data
  // 2. Remove that ones that are not in "data" anymore

  // Add new data
}

function expandUrls(prefix, baseUrl, urls) {
  const result = [];

  urls.forEach(url => {
    result.push(url.replace(prefix, baseUrl));
  });

  return result;
}

function collapseUrls(prefix, baseUrl, urls) {
  const result = [];

  urls.forEach(url => {
    result.push(url.replace(baseUrl, prefix));
  });

  return result;
}

function assureArray(value) {
  if (value && (typeof value === 'string' || value instanceof String)) {
    value = [value];
  } else if (!value) {
    value = [];
  }

  return value;
}
