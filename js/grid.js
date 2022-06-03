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
  let lock = ' 🔒';

  if (canWrite) {
    lock = '';
  }

  return [
    {field: "title", caption: "Title", width: 250, sort: true,
      columnType: "multilinetext",
      style: {
        autoWrapText: true,
      }},
    {field: "assignee", caption: "Assignee", width: 200, sort: true},
    {field: "type", caption: "Type", width: 100, sort: true},
    {field: "state", caption: "State", width: 100, sort: true},
    {field: "labels", caption: "Labels", width: 250, sort: true},
    {field: "dueDate", caption: `Due date${lock}`, width: canWrite ? 100: 115, action: canWrite ? 'input' : null, sort: true},
    {field: "projects", caption: `Projects${lock}`, width: 250, action: canWrite ? 'input' : null, sort: true},
    {field: "milestones", caption: `Milestones${lock}`, width: 250, action: canWrite ? 'input' : null, sort: true},
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
