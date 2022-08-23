import * as cheetahGrid from "cheetah-grid";
import {getIssues, convertIssuesToGridRecords} from './github-issues'
import {updateAnnotationsForIssue} from "./annotations";
import {fetch, handleIncomingRedirect, getDefaultSession, login} from '@inrupt/solid-client-authn-browser';
import {
  canWriteToResource,
  getLocation,
  getMostRecentWebID,
  getPersonName,
  getRDFasJson, setLocation,
  setMostRecentWebID
} from "./utils";
import {getDefaultVisibleColumns, getGrid} from "./grid";

const ALL_SAVED = 'All data is saved.';
let settings = {}
let issues;
let grid;
let currentVisibleColumns = getDefaultVisibleColumns();
let currentNonEmptyColumns = [];
let currentShownIssues;
let currentRecordsBeforeFilteringNonEmptyColumns;

window.onload = async () => {
  let solidFetch = fetch;

  document.getElementById('log-in-btn').addEventListener('click', () => {
    clickLogInBtn(solidFetch)
  });

  document.getElementById('reload-grid-btn').addEventListener('click', async () => {
    issues = await setUpGrid({solidFetch, storageLocationUrl, canWriteToStorageLocation: settings.canWriteToStorageLocation, visibleColumns: currentVisibleColumns, nonEmptyColumns: currentNonEmptyColumns});
  });

  document.getElementById('filter-ongoing-btn').addEventListener('click', () => {
    const filteredIssues = getOngoingChallengeIssues();

    setUpGrid({solidFetch, storageLocationUrl, canWriteToStorageLocation: settings.canWriteToStorageLocation, issues: filteredIssues, visibleColumns: currentVisibleColumns});
  });

  document.getElementById('filter-approved-without-lead-btn').addEventListener('click', () => {
    const filteredIssues = getApprovedChallengeWithoutLeadIssues();

    setUpGrid({solidFetch, storageLocationUrl, canWriteToStorageLocation: settings.canWriteToStorageLocation, issues: filteredIssues, visibleColumns: currentVisibleColumns});
  });

  document.getElementById('filter-completed-btn').addEventListener('click', () => {
    const filteredIssues = getCompletedChallengeIssues();

    setUpGrid({solidFetch, storageLocationUrl, canWriteToStorageLocation: settings.canWriteToStorageLocation, issues: filteredIssues, visibleColumns: currentVisibleColumns});
  });

  document.getElementById('filter-all-btn').addEventListener('click', () => {
    setUpGrid({solidFetch, storageLocationUrl, canWriteToStorageLocation: settings.canWriteToStorageLocation, issues, visibleColumns: currentVisibleColumns});
  });

  document.getElementById('config-grid-btn').addEventListener('click', () => {
    const $btn = document.getElementById('config-grid-btn');
    const classList = document.getElementById('grid-config').classList;

    if (classList.contains('hidden')) {
      classList.remove('hidden');
      $btn.innerText = 'Hide grid settings';
    } else {
      classList.add('hidden');
      $btn.innerText = 'Show grid settings';
    }
  });

  const allVisibleColumnCheckBox = document.querySelectorAll('#visible-columns input[type=checkbox]')

  allVisibleColumnCheckBox.forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      checkboxVisibleColumnChanged(solidFetch, storageLocationUrl);
    })
  });

  const allNonEmptyColumnCheckBox = document.querySelectorAll('#non-empty-columns input[type=checkbox]')

  allNonEmptyColumnCheckBox.forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      checkboxNonEmptyColumnChanged(solidFetch, storageLocationUrl);
    })
  });

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const storageLocationUrl = urlParams.get('location') || getLocation() || 'https://pheyvaer.pod.knows.idlab.ugent.be/profile/issue-tracker';
  setLocation(storageLocationUrl);
  const githubOwner = urlParams.get('githubOwner') || 'SolidLabResearch';
  const githubRepo = urlParams.get('githubRepo') || 'Challenges';

  document.getElementById('storage-location').value = storageLocationUrl;
  settings = {githubOwner, githubRepo};

  const webIDInput = document.getElementById('webid');
  webIDInput.value = getMostRecentWebID();
  webIDInput.addEventListener("keyup", ({key}) => {
    if (key === "Enter") {
      clickLogInBtn(solidFetch);
    }
  })

  loginAndFetch(null, solidFetch);
};

async function loginAndFetch(oidcIssuer, solidFetch) {
  // 1. Call the handleIncomingRedirect() function to complete the authentication process.
  //   If the page is being loaded after the redirect from the Solid Identity Provider
  //      (i.e., part of the authentication flow), the user's credentials are stored in-memory, and
  //      the login process is complete. That is, a session is logged in
  //      only after it handles the incoming redirect from the Solid Identity Provider.
  //   If the page is not being loaded after a redirect from the Solid Identity Provider,
  //      nothing happens.
  await handleIncomingRedirect({
    url: window.location.href,
    restorePreviousSession: true
  });

  // 2. Start the Login Process if not already logged in.
  if (!getDefaultSession().info.isLoggedIn) {
    if (oidcIssuer) {
      document.getElementById('current-user').classList.add('hidden');
      document.getElementById('webid-form').classList.remove('hidden');
      // The `login()` redirects the user to their identity provider;
      // i.e., moves the user away from the current page.
      await login({
        // Specify the URL of the user's Solid Identity Provider; e.g., "https://broker.pod.inrupt.com" or "https://inrupt.net"
        oidcIssuer,
        // Specify the URL the Solid Identity Provider should redirect to after the user logs in,
        // e.g., the current page for a single-page app.
        redirectUrl: window.location.href,
        //clientId: 'http://localhost:8081/id' //'https://knoodle.knows.idlab.ugent.be/id'
      });
    }
  } else {
    const webid = getDefaultSession().info.webId;
    const storageLocationUrl = document.getElementById('storage-location').value;
    const canWriteToStorageLocation = await canWriteToResource(storageLocationUrl, solidFetch);
    settings.canWriteToStorageLocation = canWriteToStorageLocation;

    const frame = {
      "@context": {
        "@vocab": "http://xmlns.com/foaf/0.1/",
        "knows": "https://data.knows.idlab.ugent.be/person/office/#",
        "schema": "http://schema.org/",
      },
      "@id": webid
    };

    const result = await getRDFasJson(webid, frame, fetch);
    const name = getPersonName(result) || webid;

    document.getElementById('current-user').innerText = 'Welcome ' + name;
    document.getElementById('current-user').classList.remove('hidden');
    document.getElementById('github-info').innerText = `${settings.githubOwner}/${settings.githubRepo}`;
    document.getElementById('info').classList.remove('hidden');
    document.getElementById('storage-location-container').classList.remove('hidden');
    document.getElementById('status-message').classList.remove('hidden');
    document.getElementById('webid-form').classList.add('hidden');

    if (!canWriteToStorageLocation) {
      document.getElementById('storage-location-message').classList.remove('hidden');
    }

    issues = await setUpGrid({solidFetch, storageLocationUrl, canWriteToStorageLocation});
  }
}

async function clickLogInBtn(solidFetch) {
  // Hide no OIDC issuer error
  // document.getElementById('no-oidc-issuer-error').classList.add('hidden');

  // Get web id
  const webId = document.getElementById('webid').value;
  setMostRecentWebID(webId);

  // Get issuer
  const frame = {
    "@context": {
      "@vocab": "http://xmlns.com/foaf/0.1/",
      "knows": "https://data.knows.idlab.ugent.be/person/office/#",
      "schema": "http://schema.org/",
      "solid": "http://www.w3.org/ns/solid/terms#",
      "solid:oidcIssuer": {"@type": "@id"}
    },
    "@id": webId
  };

  const result = await getRDFasJson(webId, frame, fetch);
  const oidcIssuer = result['solid:oidcIssuer'];

  if (Array.isArray(oidcIssuer)) {
    // Ask user to select desired OIDC issuer.
    //showOIDCIssuerForm(oidcIssuer);
    throw new Error('Not implemented yet.');
  }

  // Login and fetch
  if (oidcIssuer) {
    loginAndFetch(oidcIssuer, solidFetch);
  } else {
    document.getElementById('no-oidc-issuer-error').classList.remove('hidden');
  }
}

async function setUpGrid(options) {
  document.getElementById('status-message').innerText = 'Loading issues from GitHub and annotations from pod.';
  document.getElementById('grid').innerHTML = '';

  let {solidFetch, storageLocationUrl, canWriteToStorageLocation, issues, visibleColumns, records, nonEmptyColumns} = options;
  currentVisibleColumns = visibleColumns || currentVisibleColumns;
  currentNonEmptyColumns = nonEmptyColumns || currentNonEmptyColumns;

  if (!records) {
    if (!issues) {
      issues = await getIssues(settings.githubOwner, settings.githubRepo);
    }

    records = await convertIssuesToGridRecords(issues, solidFetch, storageLocationUrl);
  }

  currentShownIssues = issues;
  currentRecordsBeforeFilteringNonEmptyColumns = records;
  records = getRecordsWithNonEmptyColumns(records, currentNonEmptyColumns);

  //console.log(records);

  grid = getGrid(records, canWriteToStorageLocation, visibleColumns);

  const {
    CHANGED_VALUE,
  } = cheetahGrid.ListGrid.EVENT_TYPE;
  grid.listen(CHANGED_VALUE, async (...args) => {
    console.log(CHANGED_VALUE, args);
    document.getElementById('status-message').innerText = 'Saving to pod.';
    await updateAnnotationsForIssue({issueUrl: args[0].record.url, field: args[0].field, data: args[0].value, oldValue: args[0].oldValue, storageLocationUrl, solidFetch});
    document.getElementById('status-message').innerText = ALL_SAVED;
  });

  document.getElementById('status-message').innerText = ALL_SAVED;
  document.getElementById('filters').classList.remove('hidden');

  return issues; // To reuse them later for filtering.
}

function getOngoingChallengeIssues() {
  return issues.filter(issue => {
    const labels = issue.labels.map(label => label.name);

    return labels.includes('challenge') && labels.includes('ongoing');
  })
}

function getApprovedChallengeWithoutLeadIssues() {
  return issues.filter(issue => {
    const labels = issue.labels.map(label => label.name);

    return issue.state === 'open' && labels.includes('challenge') && labels.includes('proposal: approved ✅') && ! labels.includes('ongoing');
  })
}

function getCompletedChallengeIssues() {
  return issues.filter(issue => {
    const labels = issue.labels.map(label => label.name);

    return labels.includes('challenge') && labels.includes('completion: approved ✅');
  })
}

function getRecordsWithNonEmptyColumns(records, columns) {
  return records.filter(record => {
    let i = 0

    while (i < columns.length && record[columns[i]] && record[columns[i]] !== '' && (!Array.isArray(record[columns[i]]) || (Array.isArray(record[columns[i]]) && record[columns[i]].length > 0))) {
      i ++;
    }

    return i === columns.length;
  })
}

function checkboxVisibleColumnChanged(solidFetch, storageLocationUrl) {
  const allCheckBox = document.querySelectorAll('#visible-columns input[type=checkbox]');
  const visibleColumns = ['title', 'assignee', 'type', 'state', 'labels', 'dueDate', 'number', 'details'];

  allCheckBox.forEach((checkbox) => {
    if (checkbox.checked) {
      visibleColumns.push(checkbox.getAttribute('data-grid-column'));
    }
  });

  setUpGrid({solidFetch, storageLocationUrl, canWriteToStorageLocation: settings.canWriteToStorageLocation, issues, visibleColumns, records: grid.records});
}

function checkboxNonEmptyColumnChanged(solidFetch, storageLocationUrl) {
  const allCheckBox = document.querySelectorAll('#non-empty-columns input[type=checkbox]');
  const nonEmptyColumns = [];

  allCheckBox.forEach((checkbox) => {
    if (checkbox.checked) {
      nonEmptyColumns.push(checkbox.getAttribute('data-grid-column'));
    }
  });

  console.log(nonEmptyColumns);

  setUpGrid({solidFetch, storageLocationUrl, canWriteToStorageLocation: settings.canWriteToStorageLocation, issues: currentShownIssues, nonEmptyColumns, records: currentRecordsBeforeFilteringNonEmptyColumns});
}
