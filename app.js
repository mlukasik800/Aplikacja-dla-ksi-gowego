const STORAGE_KEY = "accounting-clients-v5";
const REQUIRED_DOC_KEYS = ["upl1", "vatr", "zus", "jpk"];

const form = document.getElementById("client-form");
const idInput = document.getElementById("client-id");
const nameInput = document.getElementById("name");
const contactPersonInput = document.getElementById("contact-person");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const settlementTypeInput = document.getElementById("settlement-type");
const monthInput = document.getElementById("month");
const bookedInput = document.getElementById("booked");
const servicePaidInput = document.getElementById("service-paid");
const fixedAssetsInput = document.getElementById("fixed-assets");
const documentsCountInput = document.getElementById("documents-count");
const monthlyFeeInput = document.getElementById("monthly-fee");
const documentsDeadlineInput = document.getElementById("documents-deadline");
const paymentDeadlineInput = document.getElementById("payment-deadline");
const upl1Input = document.getElementById("upl1");
const vatrInput = document.getElementById("vat-r");
const zusInput = document.getElementById("zus-zua");
const jpkInput = document.getElementById("jpk");
const vatSentInput = document.getElementById("vat-sent");
const zusSentInput = document.getElementById("zus-sent");
const notesInput = document.getElementById("notes");
const cancelEditBtn = document.getElementById("cancel-edit");
const fillNoteMissingBtn = document.getElementById("fill-note-missing");
const fillNoteReminderBtn = document.getElementById("fill-note-reminder");
const markDocsCompleteBtn = document.getElementById("mark-docs-complete");

const searchInput = document.getElementById("search");
const monthFilterInput = document.getElementById("month-filter");
const statusFilterInput = document.getElementById("status-filter");
const sortFilterInput = document.getElementById("sort-filter");
const setCurrentMonthBtn = document.getElementById("set-current-month");
const markVisibleBookedBtn = document.getElementById("mark-visible-booked");
const markVisiblePaidBtn = document.getElementById("mark-visible-paid");
const exportBtn = document.getElementById("export-json");
const exportCsvBtn = document.getElementById("export-csv");
const importInput = document.getElementById("import-json");
const generateReportBtn = document.getElementById("generate-report");
const clearAllBtn = document.getElementById("clear-all");
const reportPanel = document.getElementById("report-panel");
const reportOutput = document.getElementById("report-output");
const copyReportBtn = document.getElementById("copy-report");
const statsContainer = document.getElementById("stats");
const reminderCard = document.getElementById("reminder-card");
const remindersList = document.getElementById("reminders-list");

const body = document.getElementById("clients-body");
const rowTemplate = document.getElementById("row-template");

let clients = loadClients();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = {
    id: idInput.value || crypto.randomUUID(),
    name: nameInput.value.trim(),
    contactPerson: contactPersonInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),
    settlementType: settlementTypeInput.value,
    month: monthInput.value,
    booked: bookedInput.checked,
    servicePaid: servicePaidInput.checked,
    fixedAssets: fixedAssetsInput.checked,
    monthlyFee: parseMoney(monthlyFeeInput.value),
    documentsCount: parseInteger(documentsCountInput.value),
    documentsDeadline: documentsDeadlineInput.value || null,
    paymentDeadline: paymentDeadlineInput.value || null,
    documents: {
      upl1: upl1Input.checked,
      vatr: vatrInput.checked,
      zus: zusInput.checked,
      jpk: jpkInput.checked,
      vatSent: vatSentInput.checked,
      zusSent: zusSentInput.checked,
    },
    notes: notesInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (!payload.name || !payload.month || payload.documentsCount < 0 || payload.monthlyFee < 0) {
    alert("Uzupełnij poprawnie nazwę, miesiąc, liczbę dokumentów i opłatę (>= 0).");
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
sortFilterInput.addEventListener("change", render);

fillNoteMissingBtn.addEventListener("click", () => {
  notesInput.value = "Brak kompletu dokumentów. Prośba o dosłanie braków do końca tygodnia.";
});

fillNoteReminderBtn.addEventListener("click", () => {
  notesInput.value = "Wysłano przypomnienie do klienta o terminie dokumentów/deklaracji.";
});

markDocsCompleteBtn.addEventListener("click", () => {
  upl1Input.checked = true;
  vatrInput.checked = true;
  zusInput.checked = true;
  jpkInput.checked = true;
  vatSentInput.checked = true;
  zusSentInput.checked = true;
});

setCurrentMonthBtn.addEventListener("click", () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  monthFilterInput.value = currentMonth;
  monthInput.value = currentMonth;
  render();
});

markVisibleBookedBtn.addEventListener("click", () => updateVisibleClients((client) => ({ ...client, booked: true })));
markVisiblePaidBtn.addEventListener("click", () => updateVisibleClients((client) => ({ ...client, servicePaid: true })));

exportBtn.addEventListener("click", () => {
  downloadBlob(
    JSON.stringify(clients, null, 2),
    `ewidencja-klientow-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json",
  );
});

exportCsvBtn.addEventListener("click", () => {
  const csv = toCsv(clients.map(normalizeClient));
  downloadBlob(csv, `ewidencja-klientow-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
});

importInput.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Nieprawidłowy format.");

    clients = parsed.map(normalizeClient).filter((client) => client && client.name && client.month);
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

generateReportBtn.addEventListener("click", () => {
  const report = buildMonthlyReport(getFilteredClients());
  reportOutput.value = report;
  reportPanel.hidden = false;
  reportPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

copyReportBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(reportOutput.value || "");
    alert("Raport skopiowany do schowka.");
  } catch {
    alert("Nie udało się skopiować raportu.");
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
    contactPersonInput.value = client.contactPerson;
    emailInput.value = client.email;
    phoneInput.value = client.phone;
    settlementTypeInput.value = client.settlementType;
    monthInput.value = client.month;
    bookedInput.checked = client.booked;
    servicePaidInput.checked = client.servicePaid;
    fixedAssetsInput.checked = client.fixedAssets;
    monthlyFeeInput.value = client.monthlyFee;
    documentsCountInput.value = client.documentsCount;
    documentsDeadlineInput.value = client.documentsDeadline || "";
    paymentDeadlineInput.value = client.paymentDeadline || "";
    upl1Input.checked = Boolean(client.documents?.upl1);
    vatrInput.checked = Boolean(client.documents?.vatr);
    zusInput.checked = Boolean(client.documents?.zus);
    jpkInput.checked = Boolean(client.documents?.jpk);
    vatSentInput.checked = Boolean(client.documents?.vatSent);
    zusSentInput.checked = Boolean(client.documents?.zusSent);
    notesInput.value = client.notes;
    cancelEditBtn.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

function updateVisibleClients(updateFn) {
  const visible = getFilteredClients();
  if (!visible.length) {
    alert("Brak widocznych klientów do aktualizacji.");
    return;
  }

  const ids = new Set(visible.map((item) => item.id));
  clients = clients.map((item) => {
    if (!ids.has(item.id)) return item;
    const normalized = normalizeClient(item);
    return { ...updateFn(normalized), updatedAt: new Date().toISOString() };
  });

  persistClients();
  render();
}

function render() {
  const filtered = getFilteredClients();
  renderTable(filtered);
  renderStats(filtered);
  renderReminders(filtered);
}

function getFilteredClients() {
  const query = searchInput.value.trim().toLowerCase();
  const monthFilter = monthFilterInput.value;
  const statusFilter = statusFilterInput.value;
  const sortFilter = sortFilterInput.value;

  const items = clients
    .map(normalizeClient)
    .filter((client) => {
      const queryMatch =
        client.name.toLowerCase().includes(query) ||
        client.notes.toLowerCase().includes(query) ||
        client.contactPerson.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query);
      const monthMatch = !monthFilter || client.month === monthFilter;

      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "booked" && client.booked) ||
        (statusFilter === "unbooked" && !client.booked) ||
        (statusFilter === "missing-docs" && hasMissingDocuments(client)) ||
        (statusFilter === "overdue" && isOverdueDocuments(client)) ||
        (statusFilter === "unpaid" && !client.servicePaid) ||
        (statusFilter === "pending-filings" && hasPendingFilings(client));

      return queryMatch && monthMatch && statusMatch;
    });

  return sortClients(items, sortFilter);
}

function sortClients(items, sortFilter) {
  return items.sort((a, b) => {
    if (sortFilter === "month-asc") return a.month.localeCompare(b.month) || a.name.localeCompare(b.name, "pl");
    if (sortFilter === "name-asc") return a.name.localeCompare(b.name, "pl");
    if (sortFilter === "docs-desc") return b.documentsCount - a.documentsCount || a.name.localeCompare(b.name, "pl");
    if (sortFilter === "fee-desc") return b.monthlyFee - a.monthlyFee || a.name.localeCompare(b.name, "pl");
    return b.month.localeCompare(a.month) || a.name.localeCompare(b.name, "pl");
  });
}

function renderTable(items) {
  body.innerHTML = "";

  for (const client of items) {
    const fragment = rowTemplate.content.cloneNode(true);
    const row = fragment.querySelector("tr");
    row.dataset.id = client.id;

    setText(fragment, "name", client.name);
    setText(fragment, "contact", renderContact(client));
    setText(fragment, "month", formatMonth(client.month));
    setText(fragment, "settlementType", formatSettlementType(client.settlementType));
    setBoolean(fragment, "booked", client.booked);
    setPayment(fragment, client);
    setText(fragment, "documentsCount", String(client.documentsCount));
    setFilingsStatus(fragment, client);
    setDocsStatus(fragment, client);
    setDeadline(fragment, client);
    setText(fragment, "notes", client.notes || "—");

    body.appendChild(fragment);
  }

  if (!items.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="12">Brak klientów dla wybranych filtrów.</td>';
    body.appendChild(row);
  }
}

function renderStats(items) {
  const total = items.length;
  const booked = items.filter((client) => client.booked).length;
  const missingDocs = items.filter(hasMissingDocuments).length;
  const overdueDocs = items.filter(isOverdueDocuments).length;
  const unpaid = items.filter((client) => !client.servicePaid).length;
  const pendingFilings = items.filter(hasPendingFilings).length;
  const totalDocuments = items.reduce((sum, client) => sum + client.documentsCount, 0);
  const totalFees = items.reduce((sum, client) => sum + client.monthlyFee, 0);

  const cards = [
    { label: "Klienci", value: total },
    { label: "Zaksięgowani", value: booked },
    { label: "Braki dokumentów", value: missingDocs },
    { label: "Po terminie dokumentów", value: overdueDocs },
    { label: "Nieopłaceni", value: unpaid },
    { label: "Niewysłane deklaracje", value: pendingFilings },
    { label: "Łączna liczba dokumentów", value: totalDocuments },
    { label: "Suma abonamentów", value: formatCurrency(totalFees) },
    { label: "Postęp księgowania", value: `${total ? Math.round((booked / total) * 100) : 0}%` },
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

function renderReminders(items) {
  const reminders = items
    .flatMap((client) => {
      const notes = [];
      if (isOverdueDocuments(client) && !client.booked) {
        notes.push(`${client.name}: dokumenty po terminie (${formatDate(client.documentsDeadline)})`);
      }
      if (isOverduePayment(client) && !client.servicePaid) {
        notes.push(`${client.name}: zaległa płatność (${formatDate(client.paymentDeadline)})`);
      }
      if (hasPendingFilings(client)) {
        notes.push(`${client.name}: brak wysyłki VAT/JPK lub ZUS`);
      }
      return notes;
    })
    .slice(0, 10);

  reminderCard.hidden = reminders.length === 0;
  remindersList.innerHTML = reminders.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
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
  const labels = { upl1: "UPL-1", vatr: "VAT-R", zus: "ZUS", jpk: "JPK" };
  cell.textContent = `Braki: ${missing.map((key) => labels[key]).join(", ")}`;
  cell.className = "status no";
}

function setFilingsStatus(fragment, client) {
  const cell = fragment.querySelector('[data-field="filingsStatus"]');
  if (!cell) return;
  const missing = [];
  if (!client.documents.vatSent) missing.push("VAT/JPK");
  if (!client.documents.zusSent) missing.push("ZUS");
  if (!missing.length) {
    cell.textContent = "Wysłane";
    cell.className = "status ok";
    return;
  }
  cell.textContent = `Brak: ${missing.join(", ")}`;
  cell.className = "status no";
}

function setPayment(fragment, client) {
  const cell = fragment.querySelector('[data-field="payment"]');
  if (!cell) return;
  const paid = client.servicePaid ? "opłacona" : "nieopłacona";
  const overdue = isOverduePayment(client) && !client.servicePaid ? " ⚠️" : "";
  cell.textContent = `${formatCurrency(client.monthlyFee)} / ${paid}${overdue}`;
  cell.className = client.servicePaid ? "status ok" : "status no";
}

function setDeadline(fragment, client) {
  const cell = fragment.querySelector('[data-field="documentsDeadline"]');
  if (!cell) return;
  const date = formatDate(client.documentsDeadline);
  if (date === "—") {
    cell.textContent = date;
    return;
  }
  if (isOverdueDocuments(client) && !client.booked) {
    cell.textContent = `${date} ⚠️`;
    cell.classList.add("no");
    return;
  }
  cell.textContent = date;
}

function hasMissingDocuments(client) {
  return REQUIRED_DOC_KEYS.some((key) => !client.documents[key]);
}

function hasPendingFilings(client) {
  return !client.documents.vatSent || !client.documents.zusSent;
}

function isOverdueDocuments(client) {
  return isDateInPast(client.documentsDeadline);
}

function isOverduePayment(client) {
  return isDateInPast(client.paymentDeadline);
}

function isDateInPast(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

function formatMonth(monthValue) {
  if (!monthValue) return "—";
  const [year, month] = monthValue.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function formatDate(dateValue) {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pl-PL").format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 }).format(value || 0);
}

function formatSettlementType(value) {
  const labels = { kpir: "KPiR", ryczalt: "Ryczałt", "pelna-ksiegowosc": "Pełna księgowość" };
  return labels[value] || value || "—";
}

function renderContact(client) {
  const parts = [client.contactPerson, client.email, client.phone].filter(Boolean);
  return parts.length ? parts.join(" | ") : "—";
}

function parseInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : 0;
}

function parseMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function resetForm() {
  form.reset();
  idInput.value = "";
  cancelEditBtn.hidden = true;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildMonthlyReport(items) {
  const total = items.length;
  const booked = items.filter((c) => c.booked).length;
  const unpaid = items.filter((c) => !c.servicePaid).length;
  const missingDocs = items.filter(hasMissingDocuments).length;
  const pendingFilings = items.filter(hasPendingFilings).length;
  const overdueDocs = items.filter((c) => isOverdueDocuments(c) && !c.booked).length;
  const overduePayments = items.filter((c) => isOverduePayment(c) && !c.servicePaid).length;
  const feeSum = items.reduce((acc, c) => acc + c.monthlyFee, 0);

  const topDocs = [...items]
    .sort((a, b) => b.documentsCount - a.documentsCount)
    .slice(0, 5)
    .map((c) => `- ${c.name}: ${c.documentsCount} dokumentów`)
    .join("\n");

  return [
    `Raport miesięczny (${new Date().toLocaleDateString("pl-PL")})`,
    `Liczba klientów: ${total}`,
    `Zaksięgowani: ${booked} (${total ? Math.round((booked / total) * 100) : 0}%)`,
    `Nieopłaceni: ${unpaid}`,
    `Braki dokumentów: ${missingDocs}`,
    `Niewysłane deklaracje: ${pendingFilings}`,
    `Po terminie dokumentów (niezaksięgowani): ${overdueDocs}`,
    `Po terminie płatności (nieopłaceni): ${overduePayments}`,
    `Suma abonamentów: ${formatCurrency(feeSum)}`,
    "",
    "TOP 5 klientów wg liczby dokumentów:",
    topDocs || "- brak danych",
  ].join("\n");
}

function toCsv(items) {
  const headers = [
    "Nazwa klienta", "Osoba kontaktowa", "Email", "Telefon", "Typ rozliczenia", "Miesiąc", "Zaksięgowany",
    "Obsługa opłacona", "Miesięczna opłata", "Liczba dokumentów", "Termin dokumentów", "Termin płatności",
    "UPL-1", "VAT-R", "ZUS", "JPK", "VAT/JPK wysłane", "Deklaracje ZUS wysłane", "Środki trwałe", "Notatki",
  ];

  const rows = items.map((client) => [
    client.name, client.contactPerson, client.email, client.phone, formatSettlementType(client.settlementType),
    client.month, client.booked ? "TAK" : "NIE", client.servicePaid ? "TAK" : "NIE", String(client.monthlyFee),
    String(client.documentsCount), client.documentsDeadline || "", client.paymentDeadline || "",
    client.documents.upl1 ? "TAK" : "NIE", client.documents.vatr ? "TAK" : "NIE", client.documents.zus ? "TAK" : "NIE",
    client.documents.jpk ? "TAK" : "NIE", client.documents.vatSent ? "TAK" : "NIE", client.documents.zusSent ? "TAK" : "NIE",
    client.fixedAssets ? "TAK" : "NIE", client.notes,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
}

function persistClients() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function loadClients() {
  try {
    const rawCurrent = localStorage.getItem(STORAGE_KEY);
    const rawLegacy =
      localStorage.getItem("accounting-clients-v4") ||
      localStorage.getItem("accounting-clients-v3") ||
      localStorage.getItem("accounting-clients-v2") ||
      localStorage.getItem("accounting-clients-v1");
    const raw = rawCurrent || rawLegacy;
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed.map(normalizeClient).filter(Boolean);
    if (!rawCurrent && normalized.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return [];
  }
}

function normalizeClient(client) {
  if (!client || typeof client !== "object") return null;

  return {
    id: String(client.id || crypto.randomUUID()),
    name: String(client.name || "").trim(),
    contactPerson: String(client.contactPerson || ""),
    email: String(client.email || ""),
    phone: String(client.phone || ""),
    settlementType: String(client.settlementType || "kpir"),
    month: String(client.month || ""),
    booked: Boolean(client.booked),
    servicePaid: Boolean(client.servicePaid),
    fixedAssets: Boolean(client.fixedAssets),
    monthlyFee: Math.max(0, parseMoney(client.monthlyFee)),
    documentsCount: Math.max(0, parseInteger(client.documentsCount)),
    documentsDeadline: client.documentsDeadline || null,
    paymentDeadline: client.paymentDeadline || null,
    documents: {
      upl1: Boolean(client.documents?.upl1 ?? client.upl1),
      vatr: Boolean(client.documents?.vatr),
      zus: Boolean(client.documents?.zus),
      jpk: Boolean(client.documents?.jpk),
      vatSent: Boolean(client.documents?.vatSent),
      zusSent: Boolean(client.documents?.zusSent),
    },
    notes: String(client.notes || ""),
    updatedAt: client.updatedAt || new Date().toISOString(),
  };
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
