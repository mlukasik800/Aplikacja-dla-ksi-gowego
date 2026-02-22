const STORAGE_KEY = "accounting-clients-v2";
const REQUIRED_DOC_KEYS = ["upl1", "vatr", "zus", "jpk"];

const form = document.getElementById("client-form");
const idInput = document.getElementById("client-id");
const nameInput = document.getElementById("name");
const monthInput = document.getElementById("month");
const bookedInput = document.getElementById("booked");
const fixedAssetsInput = document.getElementById("fixed-assets");
const documentsCountInput = document.getElementById("documents-count");
const documentsDeadlineInput = document.getElementById("documents-deadline");
const upl1Input = document.getElementById("upl1");
const vatrInput = document.getElementById("vat-r");
const zusInput = document.getElementById("zus-zua");
const jpkInput = document.getElementById("jpk");
const notesInput = document.getElementById("notes");
const cancelEditBtn = document.getElementById("cancel-edit");

const searchInput = document.getElementById("search");
const monthFilterInput = document.getElementById("month-filter");
const statusFilterInput = document.getElementById("status-filter");
const exportBtn = document.getElementById("export-json");
const importInput = document.getElementById("import-json");
const clearAllBtn = document.getElementById("clear-all");
const statsContainer = document.getElementById("stats");

const body = document.getElementById("clients-body");
const rowTemplate = document.getElementById("row-template");

let clients = loadClients();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = {
    id: idInput.value || crypto.randomUUID(),
    name: nameInput.value.trim(),
    month: monthInput.value,
    booked: bookedInput.checked,
    fixedAssets: fixedAssetsInput.checked,
    documentsCount: parseInteger(documentsCountInput.value),
    documentsDeadline: documentsDeadlineInput.value || null,
    documents: {
      upl1: upl1Input.checked,
      vatr: vatrInput.checked,
      zus: zusInput.checked,
      jpk: jpkInput.checked,
    },
    notes: notesInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (!payload.name || !payload.month || payload.documentsCount < 0) {
    alert("Uzupełnij poprawnie nazwę, miesiąc i liczbę dokumentów (>= 0).");
    return;
  }

  const index = clients.findIndex((client) => client.id === payload.id);
  if (index >= 0) clients[index] = payload;
  else clients.push(payload);

  persistClients();
  resetForm();
  render();
});

cancelEditBtn.addEventListener("click", resetForm);
searchInput.addEventListener("input", render);
monthFilterInput.addEventListener("input", render);
statusFilterInput.addEventListener("change", render);

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(clients, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ewidencja-klientow-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Nieprawidłowy format.");

    clients = parsed
      .map(normalizeClient)
      .filter((client) => client && client.name && client.month);

    persistClients();
    render();
    resetForm();
    alert("Import zakończony sukcesem.");
  } catch {
    alert("Nie udało się zaimportować pliku JSON.");
  } finally {
    importInput.value = "";
  }
});

clearAllBtn.addEventListener("click", () => {
  if (!confirm("Czy na pewno usunąć wszystkich klientów?")) return;
  clients = [];
  persistClients();
  render();
  resetForm();
});

body.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const row = event.target.closest("tr");
  const id = row?.dataset.id;
  if (!id) return;

  if (button.dataset.action === "delete") {
    clients = clients.filter((client) => client.id !== id);
    persistClients();
    render();
    return;
  }

  if (button.dataset.action === "edit") {
    const client = clients.find((item) => item.id === id);
    if (!client) return;

    idInput.value = client.id;
    nameInput.value = client.name;
    monthInput.value = client.month;
    bookedInput.checked = client.booked;
    fixedAssetsInput.checked = client.fixedAssets;
    documentsCountInput.value = client.documentsCount;
    documentsDeadlineInput.value = client.documentsDeadline || "";
    upl1Input.checked = Boolean(client.documents?.upl1);
    vatrInput.checked = Boolean(client.documents?.vatr);
    zusInput.checked = Boolean(client.documents?.zus);
    jpkInput.checked = Boolean(client.documents?.jpk);
    notesInput.value = client.notes;
    cancelEditBtn.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

function render() {
  const filtered = getFilteredClients();
  renderTable(filtered);
  renderStats(filtered);
}

function getFilteredClients() {
  const query = searchInput.value.trim().toLowerCase();
  const monthFilter = monthFilterInput.value;
  const statusFilter = statusFilterInput.value;

  return clients
    .map(normalizeClient)
    .filter((client) => {
      const queryMatch =
        client.name.toLowerCase().includes(query) || client.notes.toLowerCase().includes(query);
      const monthMatch = !monthFilter || client.month === monthFilter;

      const missingDocs = hasMissingDocuments(client);
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "booked" && client.booked) ||
        (statusFilter === "unbooked" && !client.booked) ||
        (statusFilter === "missing-docs" && missingDocs);

      return queryMatch && monthMatch && statusMatch;
    })
    .sort((a, b) => b.month.localeCompare(a.month) || a.name.localeCompare(b.name, "pl"));
}

function renderTable(items) {
  body.innerHTML = "";

  for (const client of items) {
    const fragment = rowTemplate.content.cloneNode(true);
    const row = fragment.querySelector("tr");
    row.dataset.id = client.id;

    setText(fragment, "name", client.name);
    setText(fragment, "month", formatMonth(client.month));
    setBoolean(fragment, "booked", client.booked);
    setText(fragment, "documentsCount", String(client.documentsCount));
    setDocsStatus(fragment, client);
    setText(fragment, "documentsDeadline", formatDate(client.documentsDeadline));
    setText(fragment, "notes", client.notes || "—");

    body.appendChild(fragment);
  }

  if (!items.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="8">Brak klientów dla wybranych filtrów.</td>';
    body.appendChild(row);
  }
}

function renderStats(items) {
  const total = items.length;
  const booked = items.filter((client) => client.booked).length;
  const missingDocs = items.filter(hasMissingDocuments).length;
  const totalDocuments = items.reduce((sum, client) => sum + client.documentsCount, 0);

  const cards = [
    { label: "Klienci", value: total },
    { label: "Zaksięgowani", value: booked },
    { label: "Braki dokumentów", value: missingDocs },
    { label: "Łączna liczba dokumentów", value: totalDocuments },
  ];

  statsContainer.innerHTML = cards
    .map(
      (card) => `
      <article class="stat-card">
        <h3>${card.value}</h3>
        <p>${card.label}</p>
      </article>
    `,
    )
    .join("");
}

function setText(fragment, field, value) {
  const cell = fragment.querySelector(`[data-field="${field}"]`);
  if (cell) cell.textContent = value;
}

function setBoolean(fragment, field, value) {
  const cell = fragment.querySelector(`[data-field="${field}"]`);
  if (!cell) return;
  cell.textContent = value ? "TAK" : "NIE";
  cell.classList.add("status", value ? "ok" : "no");
}

function setDocsStatus(fragment, client) {
  const cell = fragment.querySelector('[data-field="docsStatus"]');
  if (!cell) return;

  const missing = REQUIRED_DOC_KEYS.filter((key) => !client.documents[key]);
  if (!missing.length) {
    cell.textContent = "Komplet";
    cell.className = "status ok";
    return;
  }

  const labels = {
    upl1: "UPL-1",
    vatr: "VAT-R",
    zus: "ZUS",
    jpk: "JPK",
  };

  cell.textContent = `Braki: ${missing.map((key) => labels[key]).join(", ")}`;
  cell.className = "status no";
}

function hasMissingDocuments(client) {
  return REQUIRED_DOC_KEYS.some((key) => !client.documents[key]);
}

function formatMonth(monthValue) {
  if (!monthValue) return "—";
  const [year, month] = monthValue.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function formatDate(dateValue) {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pl-PL").format(date);
}

function parseInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : 0;
}

function resetForm() {
  form.reset();
  idInput.value = "";
  cancelEditBtn.hidden = true;
}

function persistClients() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function loadClients() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeClient).filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeClient(client) {
  if (!client || typeof client !== "object") return null;

  return {
    id: String(client.id || crypto.randomUUID()),
    name: String(client.name || "").trim(),
    month: String(client.month || ""),
    booked: Boolean(client.booked),
    fixedAssets: Boolean(client.fixedAssets),
    documentsCount: Math.max(0, parseInteger(client.documentsCount)),
    documentsDeadline: client.documentsDeadline || null,
    documents: {
      upl1: Boolean(client.documents?.upl1 ?? client.upl1),
      vatr: Boolean(client.documents?.vatr),
      zus: Boolean(client.documents?.zus),
      jpk: Boolean(client.documents?.jpk),
    },
    notes: String(client.notes || ""),
    updatedAt: client.updatedAt || new Date().toISOString(),
  };
}
