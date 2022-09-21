import {getRDFasJson} from "./utils";

const baseUrls = {
  projects: 'https://data.knows.idlab.ugent.be/project/',
  milestones: 'https://data.knows.idlab.ugent.be/milestone/'
};

const predicates = {
  projects: `https://data.knows.idlab.ugent.be/person/office/#relatedProject`,
  milestones: `https://data.knows.idlab.ugent.be/person/office/#milestone`,
  workPackages: `https://data.knows.idlab.ugent.be/person/office/#relatedWorkPackage`
};

export async function getAnnotationsForIssue(issueUrl, solidFetch, storageLocationUrl) {
  const frame = {
    "@context": {
      "@vocab": "https://data.knows.idlab.ugent.be/person/office/#",
      "relatedProject": {"@type": "@id"},
      "relatedWorkPackage": {"@type": "@id"},
      "milestone": {"@type": "@id"},
      "schema": "http://schema.org/",
      "http://purl.org/vocab/frbr/core#partOf": {"@type": "@id"}
    },
    "@id": issueUrl
  };

  const data = await getRDFasJson(storageLocationUrl, frame, solidFetch);
  console.log(data);

  data.relatedProject = collapseUrls(':', baseUrls.projects, assureArray(data.relatedProject));
  data.milestone = collapseUrls(':', baseUrls.milestones, assureArray(data.milestone));

  if (!data.relatedWorkPackage) {
    data.relatedWorkPackage = [];
  } else if (!Array.isArray(data.relatedWorkPackage)) {
    data.relatedWorkPackage = [data.relatedWorkPackage];
  }

  data.relatedWorkPackage = data.relatedWorkPackage.filter(wp => wp['http://purl.org/vocab/frbr/core#partOf'] === baseUrls.projects + 'solidlab');
  data.relatedWorkPackage = data.relatedWorkPackage.map(wp => wp['schema:identifier']);

  if (!data.priority) {
    data.priority = [];
  } else if (!Array.isArray(data.priority)) {
    data.priority = [data.priority];
  }

  return {
    projects: data.relatedProject,
    milestones: data.milestone,
    dueDate: data.dueDate,
    workPackages: data.relatedWorkPackage,
    dnbPriority: getDNBPriority(data.priority)
  }
}

/**
 * This function returns the priority of an issue for the DNB project.
 * @param priorities - Array of priorities of an issue.
 * @returns {null|*} - The priority for the DNB project or null if no priority is found.
 */
function getDNBPriority(priorities) {
  for (const priority in priorities) {
    if (priority['schema:agent'] === baseUrls.projects + 'dnb') {
      return priority['priorityValue'];
    }
  }

  return null;
}

export async function updateAnnotationsForIssue(options) {
  let {issueUrl, field, data, oldValue, solidFetch, storageLocationUrl} = options;

  if (field === 'projects' || field === 'milestones' || field === 'workPackages') {
    if (!Array.isArray(data)) {
      data = data.split(',');
    }

    if (field === 'projects' || field === 'milestones') {
      data = expandUrls(':', baseUrls[field], data);
    }

    data = data.filter(a => a !== '');

    if (!Array.isArray(oldValue)) {
      oldValue = oldValue.split(',');
    }

    if (field === 'projects' || field === 'milestones') {
      oldValue = expandUrls(':', baseUrls[field], oldValue);
    }

    oldValue = oldValue.filter(a => a !== '');

    let addedItems = data.filter(a => !oldValue.includes(a));
    let removedItems = oldValue.filter(a => !data.includes(a));

    if (field === 'workPackages') {
      addedItems = addedItems.map(a => 'https://data.knows.idlab.ugent.be/work-package/solidlab-wp-' + a);
      removedItems = removedItems.map(a => 'https://data.knows.idlab.ugent.be/work-package/solidlab-wp-' + a);
    }

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
  } else if (field === 'dnbPriority') {
    await updateDNBPriority(options);
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

  if (data) {
    // Add new due date.
    await patch({
      storageLocationUrl,
      solidFetch,
      patch: `INSERT DATA {<${issueUrl}> <https://data.knows.idlab.ugent.be/person/office/#dueDate> "${data}"}`
    });
  }
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

async function updateDNBPriority(options) {
  const {issueUrl, data, oldValue, solidFetch, storageLocationUrl} = options;

  // Remove old DNB priority.
  await patch({
    storageLocationUrl,
    solidFetch,
    patch:
      `PREFIX schema: <http://schema.org/>
       PREFIX knows: <https://data.knows.idlab.ugent.be/person/office/#>
       DELETE {
         <${issueUrl}> knows:priority ?priority.
         ?priority knows:priorityValue "${oldValue}";
            schema:agent <${baseUrls.projects}dnb>.
      } WHERE {
        <${issueUrl}> knows:priority ?priority.
         ?priority knows:priorityValue "${oldValue}";
            schema:agent <${baseUrls.projects}dnb>.
      }`
  });

  if (data) {
    // Add new DNB priority.
    const uuid = crypto.randomUUID();
    await patch({
      storageLocationUrl,
      solidFetch,
      patch: `
       PREFIX schema: <http://schema.org/>
       PREFIX knows: <https://data.knows.idlab.ugent.be/person/office/#>
       INSERT DATA {
         <${issueUrl}> knows:priority <#${uuid}>.
         <#${uuid}> knows:priorityValue "${data}";
            schema:agent <${baseUrls.projects}dnb>.
      }`
    });
  }
}
