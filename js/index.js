import * as cheetahGrid from "cheetah-grid";
import {getIssues, convertIssuesToGridRecords} from './github-issues'
import {updateAnnotationsForIssue} from "./annotations";
import {fetch, handleIncomingRedirect, getDefaultSession, login} from '@inrupt/solid-client-authn-browser';
import {getMostRecentWebID, getPersonName, getRDFasJson, setMostRecentWebID} from "./utils";

const ALL_SAVED = 'All data is saved.';

window.onload = async () => {
  let solidFetch = fetch;

  document.getElementById('log-in-btn').addEventListener('click', () => {
    clickLogInBtn(solidFetch)
  });

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
  await handleIncomingRedirect();

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
    document.getElementById('storage-location-container').classList.remove('hidden');
    document.getElementById('status-message').classList.remove('hidden');
    document.getElementById('webid-form').classList.add('hidden');

    document.getElementById('status-message').innerText = 'Loading issues from GitHub and annotations from pod.';
    const issues = await getIssues('SolidLabResearch', 'Challenges');
    const storageLocationUrl = document.getElementById('storage-location').value;
    const records = await convertIssuesToGridRecords(issues, solidFetch, storageLocationUrl);
    //console.log(records);
    // initialize
    const grid = new cheetahGrid.ListGrid({
      // Parent element on which to place the grid
      parentElement: document.querySelector("#sample"),
      // Header definition
      header: [
        {field: "title", caption: "Title", width: 250, sort: true,
          columnType: "multilinetext",
          style: {
            autoWrapText: true,
          }},
        {field: "assignee", caption: "Assignee", width: 200, sort: true},
        {field: "type", caption: "Type", width: 100, sort: true},
        {field: "labels", caption: "Labels", width: 250, sort: true},
        {field: "dueDate", caption: "Due date", width: 100, action: 'input', sort: true},
        {field: "projects", caption: "Projects", width: 250, action: 'input', sort: true},
        {field: "milestones", caption: "Milestones", width: 250, action: 'input', sort: true},
        {field: "creator", caption: "Creator", width: 200, sort: true},
        {
          caption: 'Details',
          width: 180,
          columnType: new cheetahGrid.columns.type.ButtonColumn({
            caption: "GitHub",
          }),
          action: new cheetahGrid.columns.action.ButtonAction({
            action(rec) {
              window.open(rec.githubUrl, '_blank');
            },
          })
        }
      ],
      // Array data to be displayed on the grid
      records,
      // Column fixed position
      frozenColCount: 1,
    });

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
