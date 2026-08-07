(() => {
  const previousResponseText = Response.prototype.text;

  Response.prototype.text = async function (...args) {
    let html = await previousResponseText.apply(this, args);
    if (
      typeof html !== "string" ||
      !html.includes('id="initialPlan"') ||
      !html.includes("function renderTables")
    ) {
      return html;
    }

    html = html.replace(
      '"Fixed two-table layout · 20 seats"',
      '"Joined two-table layout · 20 seats"',
    );

    const removeMarker =
      '          if (unit.type === "single" && ![1, 7].includes(tables[0].id))';
    const splitAndRemove = `          if (unit.type === "fixed")
            appendTableAction(actions, "Split", () =>
              splitFixedJoinedTable(tables[0].id),
            );
          else if (unit.type === "merge")
            appendTableAction(actions, "Split", () =>
              unmergeTables(unit.merge.id),
            );
          if (unit.type === "single")`;

    if (html.includes(removeMarker)) {
      html = html.replace(removeMarker, splitAndRemove);
    } else {
      console.warn("Wedding planner enhancement target not found: table card split actions");
    }

    return html;
  };
})();
