import cheetahGrid from "cheetah-grid";

const DEFAULT_VISIBLE_COLUMNS = ['title', 'assignee', 'type', 'state', 'labels', 'dueDate', 'projects', 'workPackages', 'milestones', 'dnbPriority', 'creator', 'number', 'details'];

export function getGrid(records, canWrite, visibleColumns) {
  const header = _getHeaders(canWrite, visibleColumns);

  return new cheetahGrid.ListGrid({
    // Parent element on which to place the grid
    parentElement: document.querySelector("#grid"),
    header,
    records,
    frozenColCount: 1,
    defaultRowHeight: 70
  });
}

export function getDefaultVisibleColumns() {
  return DEFAULT_VISIBLE_COLUMNS;
}

function _getHeaders(canWrite, visibleColumns = DEFAULT_VISIBLE_COLUMNS) {
  let icon = ' 🔒';

  if (canWrite) {
    icon = ' ✏️';
  }

  let headers = [
    {
      field: "title", caption: "Title", width: 250, sort: true,
      columnType: "multilinetext",
      style: {
        autoWrapText: true,
      }
    },
    {field: "assignee", caption: "Assignee", width: 200, sort: true},
    {field: "type", caption: "Type", width: 100, sort: true},
    {field: "state", caption: "State", width: 100, sort: true},
    {field: "labels", caption: "Labels", width: 250, sort: true},
    {field: "dueDate", caption: `Due date${icon}`, width: 115, action: canWrite ? 'input' : null, sort: true},
    {field: "projects", caption: `Projects${icon}`, width: 250, action: canWrite ? 'input' : null, sort: true},
    {field: "workPackages", caption: `SolidLab WPs${icon}`, width: 150, action: canWrite ? 'input' : null, sort: true},
    {field: "milestones", caption: `Milestones${icon}`, width: 250, action: canWrite ? 'input' : null, sort: true},
    {field: "dnbPriority", caption: `DNB priority${icon}`, width: 140, action: canWrite ? getPriorityInputEditor() : null, sort: true},
    {field: "creator", caption: "Creator", width: 200, sort: true},
    {field: "number", caption: "Number", width: 80, sort: true},
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
  ];

  headers = headers.filter(header => visibleColumns.includes(header.field) || visibleColumns.includes(header.caption.toLowerCase()));

  return headers;
}

/**
 * This function returns an input editor that validates a priority.
 * @returns {string|*}
 */
function getPriorityInputEditor() {
  const valid = ['low', 'medium', 'high', ''];
  return new cheetahGrid.columns.action.SmallDialogInputEditor({
    validator(value) {
      if (!valid.includes(value)) {
        return `Please use "low", "medium", "high" or leave empty.`;
      }
    },
  })
}

// function sortDueDates(order, col, grid) {
//
//   const compare =
//     order === "desc"
//       ? (v1, v2) => (v1 === v2 ? 0 : v1 > v2 ? 1 : -1)
//       : (v1, v2) => (v1 === v2 ? 0 : v1 < v2 ? 1 : -1);
//   records.sort((r1, r2) => {
//     const dueDate1 = r1.dueDate;
//     const dueDate2 = r2.dueDate;
//
//     if (dueDate1 === '') {
//       return -1;
//     }
//
//     if (dueDate2 === '') {
//       return 1;
//     }
//   });
//   grid.records = records;
// }
