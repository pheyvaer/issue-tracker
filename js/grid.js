import cheetahGrid from "cheetah-grid";

export function getGrid(records, canWrite) {
  const header = _getHeaders(canWrite);

  return new cheetahGrid.ListGrid({
    // Parent element on which to place the grid
    parentElement: document.querySelector("#grid"),
    header,
    records,
    frozenColCount: 1,
  });
}

function _getHeaders(canWrite) {
  let icon = ' 🔒';

  if (canWrite) {
    icon = ' ✏️';
  }

  return [
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
