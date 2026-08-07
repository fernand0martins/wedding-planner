(() => {
  const originalResponseText = Response.prototype.text;

  function replaceOrWarn(html, pattern, replacement, label) {
    if (!pattern.test(html)) {
      console.warn(`Wedding planner enhancement target not found: ${label}`);
      return html;
    }
    return html.replace(pattern, replacement);
  }

  function enhanceWeddingPlannerHtml(html) {
    if (
      typeof html !== "string" ||
      !html.includes('id="initialPlan"') ||
      !html.includes("function normalizePlan")
    ) {
      return html;
    }

    html = html.replace(
      /tables\.filter\(\(t\) => !t\.fixedJoined && t\.id !== 1\)\.map\(\(t\) => t\.id\)/g,
      "tables.filter((t) => !t.fixedJoined).map((t) => t.id)",
    );

    html = html.replace(
      /\(t\) => !t\.fixedJoined && t\.id !== 1 && !merged\.has\(t\.id\)/g,
      "(t) => !t.fixedJoined && !merged.has(t.id)",
    );

    html = html.replace(
      "if (!table || table.fixedJoined || id === 1) return;",
      "if (!table || table.fixedJoined) return;",
    );

    html = replaceOrWarn(
      html,
      /(<div class="control">\s*<label for="tableNameInput">Table name<\/label)/,
      `<div class="control">
            <label for="tableNumberInput">Table number</label>
            <input id="tableNumberInput" type="number" min="1" step="1" inputmode="numeric" />
          </div>
          $1`,
      "table number field",
    );

    const mergeFunctions = `      function populateMergeControls() {
        const eligible = eligibleMergeTables(),
          a = byId("mergeTableA"),
          b = byId("mergeTableB"),
          oldA = a.value,
          oldB = b.value;
        for (const select of [a, b]) {
          select.innerHTML = '<option value="">Choose a table</option>';
          eligible.forEach((t) => {
            const o = document.createElement("option");
            o.value = t.id;
            o.textContent = "Table " + t.id + " · " + t.name;
            select.appendChild(o);
          });
        }
        if (eligible.some((t) => String(t.id) === oldA)) a.value = oldA;
        if (eligible.some((t) => String(t.id) === oldB)) b.value = oldB;
        byId("mergeBtn").disabled = eligible.length < 2;
        const list = byId("mergeList");
        list.innerHTML = "";
        for (const t of plan.tables.filter((t) => t.fixedJoined)) {
          const item = document.createElement("div");
          item.className = "merge-item fixed";
          const span = document.createElement("span");
          span.innerHTML = "<strong>Table " + t.id + "A + " + t.id + "B</strong><br>Joined layout";
          const button = document.createElement("button");
          button.textContent = "Split";
          button.addEventListener("click", () => splitFixedJoinedTable(t.id));
          item.append(span, button);
          list.appendChild(item);
        }
        for (const m of plan.state.merges) {
          const item = document.createElement("div");
          item.className = "merge-item";
          const span = document.createElement("span");
          span.innerHTML = "<strong>Tables " + m.tableIds.join(" + ") + "</strong><br>Joined layout";
          const button = document.createElement("button");
          button.textContent = "Split";
          button.addEventListener("click", () => unmergeTables(m.id));
          item.append(span, button);
          list.appendChild(item);
        }
      }
      function splitFixedJoinedTable(id) {
        const table = tableById(id);
        if (!table || !table.fixedJoined) return;

        const newId = nextTableId();
        const originalName = table.name;
        const originalSeatMap = plan.state.seats[id] || {};
        const floorItems = plan.floor && plan.floor.items ? plan.floor.items : {};
        const firstFloor = clone(floorItems["table-" + id + "-A"] || {});
        const secondFloor = clone(floorItems["table-" + id + "-B"] || {});

        pushHistory();

        table.name = originalName + " A";
        table.fixedJoined = false;
        table.seats = clone(STANDARD_SEATS);

        const newTable = {
          id: newId,
          name: originalName + " B",
          notes: table.notes,
          fixedJoined: false,
          locked: table.locked,
          orientation: table.orientation,
          seats: clone(STANDARD_SEATS),
        };

        const firstSeats = {};
        const secondSeats = {};
        for (const seat of STANDARD_SEATS) {
          firstSeats[seat] = originalSeatMap["A " + seat] || null;
          secondSeats[seat] = originalSeatMap["B " + seat] || null;
        }
        plan.state.seats[id] = firstSeats;
        plan.state.seats[newId] = secondSeats;

        if (plan.floor && plan.floor.items) {
          delete plan.floor.items["table-" + id + "-A"];
          delete plan.floor.items["table-" + id + "-B"];
          plan.floor.items["table-" + id] = firstFloor;
          plan.floor.items["table-" + newId] = secondFloor;
        }

        plan.tables.push(newTable);
        plan = normalizePlan(plan);
        savePlan();
        render();
        showToast("Table " + id + " split into Tables " + id + " and " + newId + ".");
      }
      function mergeSelected() {`;

    html = replaceOrWarn(
      html,
      /      function populateMergeControls\(\) \{[\s\S]*?      function mergeSelected\(\) \{/,
      mergeFunctions,
      "merge controls",
    );

    const unmergeFunction = `      function unmergeTables(id) {
        const merge = plan.state.merges.find((m) => m.id === id);
        if (!merge) return;
        pushHistory();
        plan.state.merges = plan.state.merges.filter((m) => m.id !== id);
        savePlan();
        render();
        showToast("Tables " + merge.tableIds.join(" and ") + " split.");
      }
      function wouldSplitOnUnmerge(merge) {`;

    html = replaceOrWarn(
      html,
      /      function unmergeTables\(id\) \{[\s\S]*?      function wouldSplitOnUnmerge\(merge\) \{/,
      unmergeFunction,
      "unmerge behavior",
    );

    const tableFunctions = `      function openTableModal(id = null) {
        editingTableId = id;
        const table = id ? tableById(id) : null;
        const number = table ? table.id : nextTableId();
        byId("tableModalTitle").textContent = table
          ? "Edit Table " + table.id
          : "Add table";
        byId("tableNumberInput").value = number;
        byId("tableNameInput").value = table ? table.name : "Table " + number;
        byId("tableNotesInput").value = table ? table.notes : "";
        byId("saveTableBtn").textContent = table ? "Save table" : "Add table";
        openModal("tableModal");
        byId("tableNameInput").focus();
      }
      function renumberTable(oldId, newId) {
        const table = tableById(oldId);
        if (!table || oldId === newId) return table;

        const seatMap = plan.state.seats[oldId] || {};
        delete plan.state.seats[oldId];
        plan.state.seats[newId] = seatMap;

        for (const merge of plan.state.merges) {
          merge.tableIds = merge.tableIds
            .map((tableId) => (tableId === oldId ? newId : tableId))
            .sort((a, b) => a - b);
        }

        if (plan.floor && plan.floor.items) {
          const suffixes = table.fixedJoined ? ["-A", "-B"] : [""];
          for (const suffix of suffixes) {
            const oldKey = "table-" + oldId + suffix;
            const newKey = "table-" + newId + suffix;
            if (plan.floor.items[oldKey]) {
              plan.floor.items[newKey] = plan.floor.items[oldKey];
              delete plan.floor.items[oldKey];
            }
          }
        }

        table.id = newId;
        editingTableId = newId;
        plan.tables.sort((a, b) => a.id - b.id);
        return table;
      }
      function saveTableDetails() {
        const name = byId("tableNameInput").value.trim();
        const notes = byId("tableNotesInput").value.trim();
        const requestedId = Number(byId("tableNumberInput").value);
        if (!Number.isInteger(requestedId) || requestedId < 1) {
          showToast("Table number must be a positive whole number.", true);
          return;
        }
        if (!name) {
          showToast("Table name is required.", true);
          return;
        }
        const duplicate = tableById(requestedId);
        if (duplicate && requestedId !== editingTableId) {
          showToast("Table " + requestedId + " already exists.", true);
          return;
        }

        pushHistory();
        if (editingTableId) {
          let table = tableById(editingTableId);
          if (!table) return;
          if (table.id !== requestedId) table = renumberTable(table.id, requestedId);
          table.name = name;
          table.notes = notes;
          showToast("Table " + table.id + " updated.");
        } else {
          const id = requestedId;
          plan.tables.push({
            id,
            name,
            notes,
            fixedJoined: false,
            locked: false,
            orientation: "vertical",
            seats: clone(STANDARD_SEATS),
          });
          plan.state.seats[id] = Object.fromEntries(
            STANDARD_SEATS.map((s) => [s, null]),
          );
          plan.tables.sort((a, b) => a.id - b.id);
          showToast("Table " + id + " added.");
        }
        plan = normalizePlan(plan);
        savePlan();
        closeModal("tableModal");
        render();
      }
      function rotateSeatingTable(id) {`;

    html = replaceOrWarn(
      html,
      /      function openTableModal\(id = null\) \{[\s\S]*?      function rotateSeatingTable\(id\) \{/,
      tableFunctions,
      "table editor",
    );

    html = html.replace(
      /Every standard table always shows all 10 seats\. Table 7 remains a\s+fixed joined pair with 20 seats\./,
      "Every standard table shows 10 seats. Joined 20-seat tables can be split into two standard tables.",
    );
    html = html.replace(
      /Removing a table sends its guests\s+to Unassigned; Tables 1 and 7 are protected\./,
      "Removing a table sends its guests to Unassigned. Table numbers can be edited from the table editor.",
    );
    html = html.replace(
      /Unmerge when no protected household spans both tables\./,
      "Split joined tables at any time; seating-rule warnings remain visible after the split.",
    );
    html = html.replace(
      /Rename and rotate tables directly from each table header\./,
      "Rename, renumber, and rotate tables directly from each table header.",
    );

    return html;
  }

  Response.prototype.text = async function (...args) {
    const text = await originalResponseText.apply(this, args);
    return enhanceWeddingPlannerHtml(text);
  };
})();
