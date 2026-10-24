(() => {
  "use strict";

  // Change this to your own 4-digit PIN before using the app.
  const ADD_CUSTOMER_PIN = "4884";
  const STORAGE_KEY = "stitchnote_customers_v1";

  const FIXED_MEASUREMENTS = [
    "கை", "அளம்", "பாடி", "கழுத்து",
    "மு.க.வு", "மு.வு", "கிராஸ்", "பட்டி"
  ];

  const $ = (id) => document.getElementById(id);
  const els = {
    search: $("searchInput"),
    clearSearch: $("clearSearchBtn"),
    list: $("customerList"),
    count: $("recordCount"),
    heading: $("listHeading"),
    empty: $("emptyState"),
    emptyTitle: $("emptyTitle"),
    emptyText: $("emptyText"),
    addModal: $("addModal"),
    detailsModal: $("detailsModal"),
    pinForm: $("pinForm"),
    pinInput: $("pinInput"),
    pinError: $("pinError"),
    customerForm: $("customerForm"),
    fixedMeasurements: $("fixedMeasurements"),
    customMeasurements: $("customMeasurements"),
    addCustomField: $("addCustomFieldBtn"),
    imageInput: $("customerImage"),
    imagePreview: $("imagePreview"),
    formError: $("formError"),
    detailsTitle: $("detailsTitle"),
    customerDetails: $("customerDetails"),
    deleteButton: $("deleteCustomerBtn"),
    toast: $("toast")
  };

  let customers = loadCustomers();
  let activeCustomerId = null;
  let selectedImageData = "";
  let toastTimeout = null;

  function loadCustomers() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  function saveCustomers() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
      return true;
    } catch (error) {
      showToast("Storage is full. Try a smaller image.");
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function makeId() {
    return (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  function openModal(id) {
    $(id).classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    $(id).classList.add("hidden");
    if (els.addModal.classList.contains("hidden") && els.detailsModal.classList.contains("hidden")) {
      document.body.style.overflow = "";
    }
  }

  function renderFixedMeasurements() {
    els.fixedMeasurements.innerHTML = FIXED_MEASUREMENTS.map((label, index) => `
      <label class="field measurement-field">
        <span>${escapeHTML(label)}</span>
        <input class="text-input fixed-measurement" data-label="${escapeHTML(label)}"
          type="text" maxlength="80" placeholder="அளவு ${index + 1}" autocomplete="off">
      </label>
    `).join("");
  }

  function addCustomMeasurementField(label = "", value = "") {
    const row = document.createElement("div");
    row.className = "custom-row";
    row.innerHTML = `
      <input class="text-input custom-label" type="text" maxlength="60" placeholder="Field name" aria-label="Additional measurement name">
      <input class="text-input custom-value" type="text" maxlength="80" placeholder="Measurement" aria-label="Additional measurement value">
      <button class="remove-field-btn" type="button" aria-label="Remove field">×</button>
    `;
    row.querySelector(".custom-label").value = label;
    row.querySelector(".custom-value").value = value;
    row.querySelector(".remove-field-btn").addEventListener("click", () => row.remove());
    els.customMeasurements.appendChild(row);
  }

  function collectMeasurements() {
    const measurements = {};
    els.fixedMeasurements.querySelectorAll(".fixed-measurement").forEach((input) => {
      const value = input.value.trim();
      if (value) measurements[input.dataset.label] = value;
    });

    const seenLabels = new Set(Object.keys(measurements).map((label) => label.toLocaleLowerCase()));
    const rows = [...els.customMeasurements.querySelectorAll(".custom-row")];
    for (const row of rows) {
      const label = row.querySelector(".custom-label").value.trim();
      const value = row.querySelector(".custom-value").value.trim();
      if (!label && !value) continue;
      if (!label || !value) {
        throw new Error("Enter both the additional field name and its measurement, or remove the empty field.");
      }
      if (seenLabels.has(label.toLocaleLowerCase())) {
        throw new Error(`The measurement field “${label}” is repeated.`);
      }
      seenLabels.add(label.toLocaleLowerCase());
      measurements[label] = value;
    }
    return measurements;
  }

  function renderCustomers() {
    const query = els.search.value.trim().toLocaleLowerCase();
    const filtered = customers
      .filter((customer) =>
        String(customer.name || "").toLocaleLowerCase().includes(query) ||
        String(customer.phone || "").toLocaleLowerCase().includes(query))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    els.count.textContent = `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;
    els.heading.textContent = query ? "Search results" : "Customers";
    els.clearSearch.classList.toggle("hidden", !els.search.value);

    els.list.innerHTML = filtered.map((customer) => {
      const initial = (customer.name || "?").trim().charAt(0) || "?";
      return `
        <button class="customer-row" type="button" data-customer-id="${escapeHTML(customer.id)}">
          <span class="avatar">${escapeHTML(initial)}</span>
          <span class="customer-main">
            <span class="customer-name">${escapeHTML(customer.name || "Unnamed customer")}</span>
            <span class="customer-phone">${escapeHTML(customer.phone || "No phone number")}</span>
          </span>
          <span class="customer-side">
            <span class="record-date">${escapeHTML(formatDate(customer.createdAt))}</span>
            <span class="row-arrow" aria-hidden="true">›</span>
          </span>
        </button>
      `;
    }).join("");

    const noMatches = filtered.length === 0;
    els.empty.classList.toggle("show", noMatches);
    if (noMatches && query) {
      els.emptyTitle.textContent = "No matching customers";
      els.emptyText.textContent = "Try another name or phone number, or add this customer as a new record.";
      $("emptyAddBtn").textContent = "+ Add customer";
    } else if (noMatches) {
      els.emptyTitle.textContent = "No customers yet";
      els.emptyText.textContent = "Add your first customer to save their measurements.";
      $("emptyAddBtn").textContent = "+ Add first customer";
    }
  }

  function resetCustomerForm() {
    els.customerForm.reset();
    els.pinForm.reset();
    els.pinError.classList.add("hidden");
    els.formError.classList.add("hidden");
    els.customerForm.classList.add("hidden");
    els.pinForm.classList.remove("hidden");
    els.customMeasurements.innerHTML = "";
    selectedImageData = "";
    els.imagePreview.src = "";
    els.imagePreview.classList.add("hidden");
    els.imageInput.value = "";
  }

  function startAddCustomer() {
    resetCustomerForm();
    openModal("addModal");
    setTimeout(() => els.pinInput.focus(), 40);
  }

  function renderDetails(customer) {
    els.detailsTitle.textContent = customer.name || "Customer details";
    const measurementEntries = Object.entries(customer.measurements || {});
    const measurementMarkup = measurementEntries.length
      ? measurementEntries.map(([label, value]) => `
          <div class="measurement-item">
            <span class="measurement-label">${escapeHTML(label)}</span>
            <span class="measurement-value">${escapeHTML(value)}</span>
          </div>
        `).join("")
      : `<p class="helper-text">No measurements have been entered for this customer.</p>`;

    const imageMarkup = customer.image
      ? `<h3 class="detail-section-title">Diagram / image</h3><img class="detail-image" src="${customer.image}" alt="Measurement diagram">`
      : "";
    const notesMarkup = customer.notes
      ? `<h3 class="detail-section-title">Notes</h3><p class="detail-notes">${escapeHTML(customer.notes)}</p>`
      : "";

    els.customerDetails.innerHTML = `
      <p class="details-contact">${escapeHTML(customer.phone || "No phone number")} · Added ${escapeHTML(formatDate(customer.createdAt))}</p>
      <h3 class="detail-section-title">Measurements</h3>
      <div class="measurement-grid">${measurementMarkup}</div>
      ${imageMarkup}
      ${notesMarkup}
    `;
    activeCustomerId = customer.id;
    openModal("detailsModal");
  }

  $("addCustomerBtn").addEventListener("click", startAddCustomer);
  $("emptyAddBtn").addEventListener("click", startAddCustomer);
  $("clearSearchBtn").addEventListener("click", () => {
    els.search.value = "";
    renderCustomers();
    els.search.focus();
  });
  els.search.addEventListener("input", renderCustomers);
  els.list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-customer-id]");
    if (!button) return;
    const customer = customers.find((item) => item.id === button.dataset.customerId);
    if (customer) renderDetails(customer);
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
  });
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeModal(backdrop.id);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal("addModal");
      closeModal("detailsModal");
    }
  });

  els.pinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (els.pinInput.value !== ADD_CUSTOMER_PIN) {
      els.pinError.classList.remove("hidden");
      els.pinInput.select();
      return;
    }
    els.pinError.classList.add("hidden");
    els.pinForm.classList.add("hidden");
    els.customerForm.classList.remove("hidden");
    setTimeout(() => $("customerName").focus(), 40);
  });

  els.addCustomField.addEventListener("click", () => addCustomMeasurementField());

  els.imageInput.addEventListener("change", () => {
    const file = els.imageInput.files && els.imageInput.files[0];
    selectedImageData = "";
    els.imagePreview.classList.add("hidden");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showFormError("Please choose an image file.");
      els.imageInput.value = "";
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      showFormError("Please choose an image smaller than 1.5 MB so it can be saved in this browser.");
      els.imageInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      selectedImageData = String(reader.result || "");
      els.imagePreview.src = selectedImageData;
      els.imagePreview.classList.remove("hidden");
    };
    reader.onerror = () => showFormError("Could not read that image. Please choose it again.");
    reader.readAsDataURL(file);
  });

  function showFormError(message) {
    els.formError.textContent = message;
    els.formError.classList.remove("hidden");
  }

  els.customerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    els.formError.classList.add("hidden");
    const name = $("customerName").value.trim();
    const phone = $("customerPhone").value.trim();
    if (!name) {
      showFormError("Please enter the customer's name.");
      $("customerName").focus();
      return;
    }

    let measurements;
    try {
      measurements = collectMeasurements();
    } catch (error) {
      showFormError(error.message);
      return;
    }

    const customer = {
      id: makeId(),
      name,
      phone,
      measurements,
      notes: $("customerNotes").value.trim(),
      image: selectedImageData,
      createdAt: new Date().toISOString()
    };

    customers.unshift(customer);
    if (!saveCustomers()) {
      customers = customers.filter((item) => item.id !== customer.id);
      return;
    }

    closeModal("addModal");
    els.search.value = "";
    renderCustomers();
    showToast("Customer saved successfully.");
  });

  els.deleteButton.addEventListener("click", () => {
    if (!activeCustomerId) return;
    const customer = customers.find((item) => item.id === activeCustomerId);
    if (!customer) return;
    if (!window.confirm(`Delete the record for ${customer.name}? This cannot be undone.`)) return;
    const previous = customers;
    customers = customers.filter((item) => item.id !== activeCustomerId);
    if (!saveCustomers()) {
      customers = previous;
      return;
    }
    activeCustomerId = null;
    closeModal("detailsModal");
    renderCustomers();
    showToast("Customer record deleted.");
  });

  renderFixedMeasurements();
  renderCustomers();
})();
