// script.js
// HealthCare Portal - frontend functionality (no backend)

// ---------- Global patient records ----------
let patientRecords = [];

// ---------- Utility Helpers ----------
function downloadTextFile(filename, content, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatDateSafe(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

// CSV helpers
function escapeCsv(value) {
  const v = (value ?? "").toString();
  return `"${v.replace(/"/g, '""')}"`;
}

function savePatientsToStorage() {
  try {
    localStorage.setItem("hc_patients", JSON.stringify(patientRecords));
  } catch (e) {
    console.warn("LocalStorage not available", e);
  }
}

function loadPatientsFromStorage() {
  try {
    const raw = localStorage.getItem("hc_patients");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading patients from storage", e);
    return null;
  }
}

function downloadPatientsCSV() {
  if (!patientRecords.length) return;
  const header = ["Name", "Age", "Disease", "Doctor", "Status", "Created At"];
  const lines = [header.map(escapeCsv).join(",")];

  patientRecords.forEach((rec) => {
    const row = [
      escapeCsv(rec.name),
      escapeCsv(rec.age),
      escapeCsv(rec.disease),
      escapeCsv(rec.doctor),
      escapeCsv(rec.status),
      escapeCsv(rec.createdAt),
    ];
    lines.push(row.join(","));
  });

  const csvContent = lines.join("\n");
  downloadTextFile("patients.csv", csvContent, "text/csv");
}

// ---------- Init patients from storage or table ----------
function initPatientRecords() {
  const fromStorage = loadPatientsFromStorage();
  if (fromStorage && Array.isArray(fromStorage) && fromStorage.length > 0) {
    patientRecords = fromStorage;
    renderPatientsTable();
    updateDashboardStats();
    return;
  }

  const tbody = document.querySelector("#patients-table tbody");
  if (!tbody) return;

  const today = new Date().toISOString().slice(0, 10);
  const rows = tbody.querySelectorAll("tr");
  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 4) return;
    const name = cells[0].textContent.trim();
    const age = cells[1].textContent.trim();
    const disease = cells[2].textContent.trim();
    const statusText = cells[3].textContent.trim() || "Stable";

    patientRecords.push({
      name,
      age,
      disease,
      doctor: "N/A",
      status: statusText,
      createdAt: today,
    });
  });

  savePatientsToStorage();
  renderPatientsTable();
  updateDashboardStats();
}

// ---------- Render patients table ----------
function renderPatientsTable() {
  const tbody = document.querySelector("#patients-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  patientRecords.forEach((p) => {
    const tr = document.createElement("tr");

    let statusClass = "status-stable";
    const lower = p.status.toLowerCase();
    if (lower.includes("review")) statusClass = "status-review";
    if (lower.includes("critical")) statusClass = "status-critical";

    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.age}</td>
      <td>${p.disease}</td>
      <td><span class="status ${statusClass}">${p.status}</span></td>
    `;

    tbody.appendChild(tr);
  });
}

// ---------- Dashboard stats ----------
function updateDashboardStats() {
  const totalEl = document.getElementById("total-patients-count");
  const todayEl = document.getElementById("registered-today-count");
  const doctorsEl = document.getElementById("active-doctors-count");
  const pendingEl = document.getElementById("pending-reports-count");
  const syncEl = document.getElementById("last-sync-text");

  const today = new Date().toISOString().slice(0, 10);

  const total = patientRecords.length;
  const registeredToday = patientRecords.filter(
    (p) => (p.createdAt || "").slice(0, 10) === today
  ).length;
  const pendingReports = patientRecords.filter(
    (p) => p.status && p.status.toLowerCase() !== "stable"
  ).length;

  const doctorSet = new Set(
    patientRecords
      .map((p) => p.doctor)
      .filter((d) => d && d !== "N/A")
  );
  const activeDoctors = doctorSet.size || 4;

  if (totalEl) totalEl.textContent = total;
  if (todayEl) todayEl.textContent = registeredToday;
  if (doctorsEl) doctorsEl.textContent = activeDoctors;
  if (pendingEl) pendingEl.textContent = pendingReports;

  if (syncEl) {
    const now = new Date();
    syncEl.textContent = `Last synced: ${now.toLocaleTimeString()}`;
  }
}

// ---------- Navbar Search ----------
function attachNavbarSearch() {
  const navSearchForm = document.getElementById("nav-search-form");
  if (!navSearchForm) return;

  const navSearchInput = navSearchForm.querySelector("input[type='text']");
  if (!navSearchInput) return;

  navSearchForm.addEventListener("submit", (e) => e.preventDefault());

  navSearchInput.addEventListener("input", () => {
    const term = navSearchInput.value.trim().toLowerCase();

    if (term.length < 2) {
      resetFilters();
      return;
    }

    filterPatientsTable(term);
    filterDoctors(term);
    filterDownloads(term);
    filterDepartments(term);
  });

  function resetFilters() {
    document
      .querySelectorAll("#patients-table tbody tr")
      .forEach((row) => (row.style.display = ""));

    document
      .querySelectorAll(".doctor-card")
      .forEach((card) => (card.style.display = ""));

    document
      .querySelectorAll(".download-list li")
      .forEach((li) => (li.style.display = ""));

    document
      .querySelectorAll("#departments-table tbody tr")
      .forEach((row) => (row.style.display = ""));
  }

  function filterPatientsTable(term) {
    const rows = document.querySelectorAll("#patients-table tbody tr");
    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? "" : "none";
    });
  }

  function filterDoctors(term) {
    const cards = document.querySelectorAll(".doctor-card");
    cards.forEach((card) => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(term) ? "" : "none";
    });
  }

  function filterDownloads(term) {
    const items = document.querySelectorAll(".download-list li");
    items.forEach((li) => {
      const text = li.textContent.toLowerCase();
      li.style.display = text.includes(term) ? "" : "none";
    });
  }

  function filterDepartments(term) {
    const rows = document.querySelectorAll("#departments-table tbody tr");
    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? "" : "none";
    });
  }
}

// ---------- Hamburger Toggle ----------
function attachHamburger() {
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (!toggle || !navLinks) return;

  toggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
}

// ---------- Home Page: Register New Patient ----------
function attachPatientRegistration() {
  const patientForm = document.getElementById("patient-form");
  if (!patientForm) return;

  const nameInput = patientForm.querySelector("[name='patientName']");
  const ageInput = patientForm.querySelector("[name='patientAge']");
  const diseaseSelect = patientForm.querySelector("[name='patientDisease']");
  const doctorSelect = patientForm.querySelector("[name='patientDoctor']");
  const viewAllBtn = document.getElementById("scroll-patients-btn");

  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", () => {
      const table = document.getElementById("patients-table");
      if (table) {
        table.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  patientForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const age = ageInput.value.trim();
    const disease = diseaseSelect.value;
    const doctor = doctorSelect.value;

    if (!name || !age || !disease || !doctor) {
      alert("Please fill all the patient details.");
      return;
    }

    const createdAt = new Date().toISOString().slice(0, 10);
    const newPatient = {
      name,
      age,
      disease,
      doctor,
      status: "Under Review",
      createdAt,
    };

    patientRecords.push(newPatient);
    savePatientsToStorage();
    renderPatientsTable();
    updateDashboardStats();
    downloadPatientsCSV();

    alert(
      `Patient "${name}" registered successfully (demo).\nUpdated patients.csv has been downloaded.`
    );
    patientForm.reset();
  });
}

// ---------- Download Page: Patient Reports ----------
function generateRandomVitals() {
  return {
    bpSystolic: 110 + Math.floor(Math.random() * 30),
    bpDiastolic: 70 + Math.floor(Math.random() * 15),
    sugarFasting: 80 + Math.floor(Math.random() * 50),
    heartRate: 65 + Math.floor(Math.random() * 25),
  };
}

function buildPatientReportText({ id, name, fromDate, toDate }) {
  const today = new Date().toLocaleString();
  const { bpSystolic, bpDiastolic, sugarFasting, heartRate } =
    generateRandomVitals();

  return `
HealthCare Portal - Patient Report
==================================

Generated On : ${today}

Patient Details
---------------
Patient ID   : ${id || "N/A"}
Patient Name : ${name || "N/A"}
Period       : ${formatDateSafe(fromDate)}  to  ${formatDateSafe(toDate)}

Summary
-------
- This is a demo auto-generated report.
- Data is not connected to any real backend.
- Use this as a sample for your project submission.

Vitals (Sample)
---------------
- Blood Pressure : ${bpSystolic}/${bpDiastolic} mmHg
- Fasting Sugar  : ${sugarFasting} mg/dL
- Heart Rate     : ${heartRate} bpm

Doctor Notes (Sample)
---------------------
- Patient advised to follow a balanced diet.
- Regular exercise at least 30 minutes/day.
- Take prescribed medicines on time.
- Schedule follow-up in 2 weeks.

End of Report
`;
}

function attachDownloadPageActions() {
  const downloadSearchForm = document.querySelector(".download-search-form");
  const downloadList = document.querySelector(".download-list");

  if (downloadSearchForm) {
    downloadSearchForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const patientId =
        downloadSearchForm.querySelector("[name='searchPatientId']")?.value.trim();
      const patientName =
        downloadSearchForm.querySelector("[name='searchPatientName']")?.value.trim();
      const dateInputs = downloadSearchForm.querySelectorAll("input[type='date']");
      const fromDate = dateInputs[0]?.value;
      const toDate = dateInputs[1]?.value;

      const reportText = buildPatientReportText({
        id: patientId,
        name: patientName,
        fromDate,
        toDate,
      });

      const safeId = patientId || patientName || "patient";
      const filename = `${safeId.replace(/\s+/g, "_").toLowerCase()}_report.txt`;
      downloadTextFile(filename, reportText);

      alert("Demo patient report downloaded successfully.");
    });
  }

  if (downloadList) {
    downloadList.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn");
      if (!btn) return;

      const item = btn.closest("li");
      if (!item) return;

      const title = item.querySelector("h3")?.textContent.trim() || "Report";
      const meta = item.querySelector(".muted")?.textContent || "";
      let patientName = "Unknown";

      const match = meta.match(/Patient:\s*([^•]+)/i);
      if (match && match[1]) {
        patientName = match[1].trim();
      }

      const text = buildPatientReportText({
        id: title,
        name: patientName,
        fromDate: "",
        toDate: "",
      });

      const filename = `${title.replace(/\s+/g, "_").toLowerCase()}_demo.txt`;
      downloadTextFile(filename, text);

      alert("Demo report for this record downloaded.");
    });
  }
}

// ---------- Department Page: Department Reports ----------
function buildDepartmentReportText({ department, fromDate, toDate }) {
  const today = new Date().toLocaleString();
  const patients = 20 + Math.floor(Math.random() * 60);
  const avgStay = (1.5 + Math.random() * 4).toFixed(1);
  const dischargeRate = (85 + Math.random() * 10).toFixed(1);

  return `
HealthCare Portal - Department Report
=====================================

Generated On  : ${today}

Department Details
------------------
Department : ${department || "N/A"}
Period     : ${formatDateSafe(fromDate)}  to  ${formatDateSafe(toDate)}

Key Metrics (Sample)
--------------------
- Total Patients      : ${patients}
- Avg. Stay Duration  : ${avgStay} days
- Discharge Rate      : ${dischargeRate} %

Manager Notes (Sample)
----------------------
- Workload is within acceptable range.
- Continue focusing on reducing waiting time.
- Monitor high-risk patients more frequently.

End of Report
`;
}

function attachDepartmentPageActions() {
  const deptForm = document.querySelector(".department-report-form");
  if (!deptForm) return;

  deptForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const deptSelect = deptForm.querySelector("[name='departmentName']");
    const dateInputs = deptForm.querySelectorAll("input[type='date']");
    const department = deptSelect?.value || "Department";
    const fromDate = dateInputs[0]?.value;
    const toDate = dateInputs[1]?.value;

    const reportText = buildDepartmentReportText({
      department,
      fromDate,
      toDate,
    });

    const filename = `${department.replace(/\s+/g, "_").toLowerCase()}_department_report.txt`;
    downloadTextFile(filename, reportText);

    alert("Demo department report downloaded successfully.");
  });
}

// ---------- Contact Page ----------
function attachContactForm() {
  const contactForm = document.getElementById("contact-form");
  if (!contactForm) return;

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Your message has been sent (demo, no real backend).");
    contactForm.reset();
  });
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  initPatientRecords();
  attachHamburger();
  attachNavbarSearch();
  attachPatientRegistration();
  attachDownloadPageActions();
  attachDepartmentPageActions();
  attachContactForm();
});
