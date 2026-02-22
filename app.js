const STORAGE_KEY = "accounting-clients-v1";

const form = document.getElementById("client-form");
const idInput = document.getElementById("client-id");
const nameInput = document.getElementById("name");
const monthInput = document.getElementById("month");
const bookedInput = document.getElementById("booked");
const upl1Input = document.getElementById("upl1");
const fixedAssetsInput = document.getElementById("fixed-assets");
const documentsCountInput = document.getElementById("documents-count");
const notesInput = document.getElementById("notes");
const cancelEditBtn = document.getElementById("cancel-edit");
const searchInput = document.getElementById("search");
const body = document.getElementById("clients-body");
const rowTemplate = document.getElementById("row-template");

let clients = loadClients();
renderClients();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = {
    id: idInput.value || crypto.randomUUID(),
    name: nameInput.value.trim(),
    month: monthInput.value,
    booked: bookedInput.checked,
    upl1: upl1Input.checked,
    fixedAssets: fixedAssetsInput.checked,
    documentsCount: Number(documentsCountInput.value),
    notes: notesInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (!payload.name || !payload.month) return;

  const existingIndex = clients.findIndex((client) => client.id === payload.id);

  if (existingIndex >= 0) {
    clients[existingIndex] = payload;
  } else {
    clients.push(payload);
  }

  persistClients();
  renderClients();
  resetForm();
});

cancelEditBtn.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderClients);

body.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const row = event.target.closest("tr");
  const id = row?.dataset.id;
  if (!id) return;

  if (button.dataset.action === "delete") {
    clients = clients.filter((client) => client.id !== id);
    persistClients();
    renderClients();
  }

  if (button.dataset.action === "edit") {
    const client = clients.find((item) => item.id === id);
    if (!client) return;

    idInput.value = client.id;
    nameInput.value = client.name;
    monthInput.value = client.month;
    bookedInput.checked = client.booked;
    upl1Input.checked = client.upl1;
    fixedAssetsInput.checked = client.fixedAssets;
    documentsCountInput.value = client.documentsCount;
    notesInput.value = client.notes;
    cancelEditBtn.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

function renderClients() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = clients
    .filter((client) => {
      return (
        client.name.toLowerCase().includes(query) ||
        client.notes.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => b.month.localeCompare(a.month) || a.name.localeCompare(b.name, "pl"));

  body.innerHTML = "";

  for (const client of filtered) {
    const fragment = rowTemplate.content.cloneNode(true);
    const row = fragment.querySelector("tr");
    row.dataset.id = client.id;

    setText(fragment, "name", client.name);
    setText(fragment, "month", formatMonth(client.month));
    setBoolean(fragment, "booked", client.booked);
    setBoolean(fragment, "upl1", client.upl1);
    setBoolean(fragment, "fixedAssets", client.fixedAssets);
    setText(fragment, "documentsCount", String(client.documentsCount));
    setText(fragment, "notes", client.notes || "—");

    body.appendChild(fragment);
  }

  if (!filtered.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="8">Brak klientów do wyświetlenia.</td>`;
    body.appendChild(row);
  }
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

function resetForm() {
  form.reset();
  idInput.value = "";
  cancelEditBtn.hidden = true;
}

function formatMonth(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function persistClients() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function loadClients() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
