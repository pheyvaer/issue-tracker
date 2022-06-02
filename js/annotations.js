import {getRDFasJson} from "./utils";

const baseUrls = {
  projects: 'https://data.knows.idlab.ugent.be/project/',
  milestones: 'https://data.knows.idlab.ugent.be/milestone/'
};

const predicates = {
  projects: `https://data.knows.idlab.ugent.be/person/office/#relatedProject`,
  milestones: `https://data.knows.idlab.ugent.be/person/office/#milestone`
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
    if (!Array.isArray(data)) {
      data = data.split(',');
    }

    data = expandUrls(':', baseUrls[field], data);
    data = data.filter(a => a !== '');

    if (!Array.isArray(oldValue)) {
      oldValue = oldValue.split(',');
    }

    oldValue = expandUrls(':', baseUrls[field], oldValue);
    oldValue = oldValue.filter(a => a !== '');

    const addedItems = data.filter(a => !oldValue.includes(a));
    const removedItems = oldValue.filter(a => !data.includes(a));

    await updateItems({
      addedItems,
      removedItems,
      storageLocationUrl,
      issueUrl,
      solidFetch,
      predicate: predicates[field]
    });
  } else if (field === 'dueDate') {
    await updateDueDate(options);
  }
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

async function patch(options) {
  const {storageLocationUrl, patch, solidFetch} = options;

  await solidFetch(storageLocationUrl,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/sparql-update'
      },
      body: patch
    });
}

async function updateDueDate(options) {
  const {issueUrl, data, oldValue, solidFetch, storageLocationUrl} = options;

  // Remove old due date.
  await patch({
    storageLocationUrl,
    solidFetch,
    patch: `DELETE DATA {<${issueUrl}> <https://data.knows.idlab.ugent.be/person/office/#dueDate> "${oldValue}"}`
  });

  // Add new due date.
  await patch({
    storageLocationUrl,
    solidFetch,
    patch: `INSERT DATA {<${issueUrl}> <https://data.knows.idlab.ugent.be/person/office/#dueDate> "${data}"}`
  });
}

async function updateItems(options) {
  const {removedItems, addedItems, issueUrl, storageLocationUrl, solidFetch, predicate} = options;

  let del = 'DELETE DATA { ';
  removedItems.forEach(item => {
    del += `<${issueUrl}> <${predicate}> <${item}>. \n`;
  });

  del += ' }';

  await patch({
    storageLocationUrl,
    solidFetch,
    patch: del
  });

  let ins = 'INSERT DATA { ';
  addedItems.forEach(item => {
    ins += `<${issueUrl}> <${predicate}> <${item}>. \n`;
  });

  ins += ' }';

  await patch({
    storageLocationUrl,
    solidFetch,
    patch: ins
  });
}
