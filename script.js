
(() => {
  "use strict";

  const SUPABASE_URL = "https://hdhoynjhhthxgskeouxh.supabase.co";
  const SUPABASE_KEY = "sb_publishable_Vdi8ZfQSGwDDgyO7TSUCfA_695WKFAI";
  const IMAGE_BUCKET = "customer-images";
  const ADD_CUSTOMER_PIN = "4826";
  const STORAGE_KEY = "stitchnote_customers_v1";

  const FIXED_MEASUREMENTS = [
    "கை", "அளம்", "பாடி", "கழுத்து",
    "மு.க.வு", "மு.வு", "கிராஸ்", "பட்டி"
  ];

  if (!window.supabase) {
    alert("Supabase could not load. Check your internet connection.");
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = (id) => document.getElementById(id);

  const els = {
    app: document.querySelector(".app-shell"),
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

  let customers = [];
  let activeCustomerId = null;
  let selectedImageFile = null;
  let toastTimeout = null;
  let currentUser = null;
  let busy = false;

  // Add login and account controls without replacing your existing HTML.
  const loginStyle = document.createElement("style");
  loginStyle.textContent = `
    .sn-login-wrap {
      min-height: 100vh; display: grid; place-items: center;
      padding: 24px; background: #f7f5f0;
      font-family: "DM Sans", system-ui, sans-serif;
    }
    .sn-login-card {
      width: min(420px, 100%); padding: 28px;
      border-radius: 18px; background: white;
      border: 1px solid #e8e8e1;
      box-shadow: 0 18px 55px rgba(28,42,32,.10);
    }
    .sn-login-card h1 { margin: 0 0 8px; color: #2e6652; }
    .sn-login-card p { color: #737b75; font-size: 14px; line-height: 1.6; }
    .sn-login-card label { display:block; font-size:13px; font-weight:700; margin-top:15px; }
    .sn-login-card input {
      display:block; width:100%; box-sizing:border-box; margin-top:7px;
      padding:12px; border:1px solid #dfe3dc; border-radius:9px;
      font:inherit;
    }
    .sn-login-card button {
      width:100%; margin-top:18px; min-height:44px; border:0;
      border-radius:9px; background:#2e6652; color:white;
      font-weight:700; cursor:pointer;
    }
    .sn-login-error { color:#b23b36 !important; overflow-wrap:anywhere; }
    .sn-account-bar {
      display:flex; align-items:center; gap:10px; flex-wrap:wrap;
      margin:0 0 18px; font-size:12px; color:#737b75;
    }
    .sn-account-bar button {
      margin-left:auto; border:1px solid #e8e8e1; border-radius:8px;
      background:white; padding:8px 12px; cursor:pointer;
    }
    .sn-status { font-size:12px; color:#2e6652; margin-top:10px; }
  `;
  document.head.appendChild(loginStyle);

  const loginWrap = document.createElement("main");
  loginWrap.className = "sn-login-wrap";
  loginWrap.innerHTML = `
    <section class="sn-login-card">
      <h1>StitchNote</h1>
      <p>Sign in to view and update your tailoring customer records across devices.</p>
      <form id="snLoginForm">
        <label for="snEmail">Email address</label>
        <input id="snEmail" type="email" autocomplete="username" required>
        <label for="snPassword">Password</label>
        <input id="snPassword" type="password" autocomplete="current-password" required>
        <button id="snLoginButton" type="submit">Sign in</button>
        <p id="snLoginError" class="sn-login-error" role="alert"></p>
        <p id="snLoginStatus" class="sn-status" role="status"></p>
      </form>
    </section>
  `;
  document.body.insertBefore(loginWrap, document.body.firstChild);

  const accountBar = document.createElement("div");
  accountBar.className = "sn-account-bar";
  accountBar.innerHTML = `
    <span id="snAccountEmail"></span>
    <button id="snSignOut" type="button">Sign out</button>
  `;
  const topbar = document.querySelector(".topbar");
  if (topbar) topbar.insertAdjacentElement("afterend", accountBar);

  function showToast(message) {
    if (!els.toast) {
      alert(message);
      return;
    }
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => els.toast.classList.remove("show"), 3000);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      day: "numeric", month: "short", year: "numeric"
    });
  }

  function openModal(id) {
    $(id).classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    $(id).classList.add("hidden");
    if (els.addModal.classList.contains("hidden") &&
        els.detailsModal.classList.contains("hidden")) {
      document.body.style.overflow = "";
    }
  }

  function showFormError(message) {
    els.formError.textContent = message;
    els.formError.classList.remove("hidden");
  }

  function clearFormError() {
    els.formError.textContent = "";
    els.formError.classList.add("hidden");
  }

  function renderFixedMeasurements() {
    els.fixedMeasurements.innerHTML = FIXED_MEASUREMENTS.map((label, index) => `
      <label class="field measurement-field">
        <span>${escapeHTML(label)}</span>
        <input class="text-input fixed-measurement"
          data-label="${escapeHTML(label)}" type="text" maxlength="80"
          placeholder="அளவு ${index + 1}" autocomplete="off">
      </label>
    `).join("");
  }

  function addCustomMeasurementField(label = "", value = "") {
    const row = document.createElement("div");
    row.className = "custom-row";
    row.innerHTML = `
      <input class="text-input custom-label" type="text" maxlength="60"
        placeholder="Field name" aria-label="Additional measurement name">
      <input class="text-input custom-value" type="text" maxlength="80"
        placeholder="Measurement" aria-label="Additional measurement value">
      <button class="remove-field-btn" type="button" aria-label="Remove field">×</button>
    `;
    row.querySelector(".custom-label").value = label;
    row.querySelector(".custom-value").value = value;
    row.querySelector(".remove-field-btn").addEventListener("click", () => row.remove());
    els.customMeasurements.appendChild(row);
  }

  function collectMeasurements() {
    const measurements = {};

    els.fixedMeasurements.querySelectorAll(".fixed-measurement").forEach(input => {
      const value = input.value.trim();
      if (value) measurements[input.dataset.label] = value;
    });

    const seen = new Set(Object.keys(measurements).map(x => x.toLocaleLowerCase()));

    for (const row of els.customMeasurements.querySelectorAll(".custom-row")) {
      const label = row.querySelector(".custom-label").value.trim();
      const value = row.querySelector(".custom-value").value.trim();
      if (!label && !value) continue;
      if (!label || !value) {
        throw new Error("Enter both the additional field name and measurement, or remove the empty field.");
      }
      if (seen.has(label.toLocaleLowerCase())) {
        throw new Error(`The measurement field "${label}" is repeated.`);
      }
      seen.add(label.toLocaleLowerCase());
      measurements[label] = value;
    }
    return measurements;
  }

  function renderCustomers() {
    const query = els.search.value.trim().toLocaleLowerCase();
    const filtered = customers
      .filter(c => String(c.name || "").toLocaleLowerCase().includes(query) ||
                   String(c.phone || "").toLocaleLowerCase().includes(query))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    els.count.textContent = `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;
    els.heading.textContent = query ? "Search results" : "Customers";
    els.clearSearch.classList.toggle("hidden", !els.search.value);

    els.list.innerHTML = filtered.map(customer => {
      const initial = (customer.name || "?").trim().charAt(0) || "?";
      return `
        <button class="customer-row" type="button"
          data-customer-id="${escapeHTML(customer.id)}">
          <span class="avatar">${escapeHTML(initial)}</span>
          <span class="customer-main">
            <span class="customer-name">${escapeHTML(customer.name || "Unnamed customer")}</span>
            <span class="customer-phone">${escapeHTML(customer.phone || "No phone number")}</span>
          </span>
          <span class="customer-side">
            <span class="record-date">${escapeHTML(formatDate(customer.createdAt))}</span>
            <span class="row-arrow" aria-hidden="true">›</span>
          </span>
        </button>`;
    }).join("");

    const none = filtered.length === 0;
    els.empty.classList.toggle("show", none);
    if (none && query) {
      els.emptyTitle.textContent = "No matching customers";
      els.emptyText.textContent = "Try another name or phone number, or add a new record.";
      $("emptyAddBtn").textContent = "+ Add customer";
    } else if (none) {
      els.emptyTitle.textContent = "No customers yet";
      els.emptyText.textContent = "Add your first customer to save their measurements.";
      $("emptyAddBtn").textContent = "+ Add first customer";
    }
  }

  async function fetchCustomers() {
    const { data, error } = await db.from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    customers = await Promise.all((data || []).map(async row => {
      let image = "";
      if (row.image_url) {
        const { data: signed, error: imageError } = await db.storage
          .from(IMAGE_BUCKET)
          .createSignedUrl(row.image_url, 3600);
        if (!imageError && signed) image = signed.signedUrl;
      }

      return {
        id: row.id,
        name: row.name,
        phone: row.phone || "",
        measurements: row.measurements || {},
        notes: row.notes || "",
        image,
        imagePath: row.image_url || "",
        createdAt: row.created_at
      };
    }));

    renderCustomers();
  }

  function resetCustomerForm() {
    els.customerForm.reset();
    els.pinForm.reset();
    els.pinError.classList.add("hidden");
    clearFormError();
    els.customerForm.classList.add("hidden");
    els.pinForm.classList.remove("hidden");
    els.customMeasurements.innerHTML = "";
    selectedImageFile = null;
    els.imagePreview.src = "";
    els.imagePreview.classList.add("hidden");
    els.imageInput.value = "";
  }

  function startAddCustomer() {
    resetCustomerForm();
    openModal("addModal");
    setTimeout(() => els.pinInput.focus(), 40);
  }

  async function uploadImage(file) {
    if (!file) return null;
    if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Please choose an image smaller than 5 MB.");

    const path = `${currentUser.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await db.storage.from(IMAGE_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type
    });
    if (error) throw error;
    return path;
  }

  async function renderDetails(customer) {
    els.detailsTitle.textContent = customer.name || "Customer details";
    const entries = Object.entries(customer.measurements || {});
    const measurementMarkup = entries.length
      ? entries.map(([label, value]) => `
          <div class="measurement-item">
            <span class="measurement-label">${escapeHTML(label)}</span>
            <span class="measurement-value">${escapeHTML(value)}</span>
          </div>`).join("")
      : `<p class="helper-text">No measurements have been entered for this customer.</p>`;

    let imageMarkup = "";
    if (customer.image) {
      imageMarkup = `
        <h3 class="detail-section-title">Diagram / image</h3>
        <img class="detail-image" src="${escapeHTML(customer.image)}" alt="Measurement diagram">`;
    }

    const notesMarkup = customer.notes
      ? `<h3 class="detail-section-title">Notes</h3><p class="detail-notes">${escapeHTML(customer.notes)}</p>`
      : "";

    els.customerDetails.innerHTML = `
      <p class="details-contact">${escapeHTML(customer.phone || "No phone number")}
      · Added ${escapeHTML(formatDate(customer.createdAt))}</p>
      <h3 class="detail-section-title">Measurements</h3>
      <div class="measurement-grid">${measurementMarkup}</div>
      ${imageMarkup}${notesMarkup}`;

    activeCustomerId = customer.id;
    openModal("detailsModal");
  }

  $("addCustomerBtn").addEventListener("click", startAddCustomer);
  $("emptyAddBtn").addEventListener("click", startAddCustomer);

  els.clearSearch.addEventListener("click", () => {
    els.search.value = "";
    renderCustomers();
    els.search.focus();
  });
  els.search.addEventListener("input", renderCustomers);

  els.list.addEventListener("click", event => {
    const button = event.target.closest("[data-customer-id]");
    if (!button) return;
    const customer = customers.find(c => c.id === button.dataset.customerId);
    if (customer) renderDetails(customer);
  });

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
  });

  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeModal(backdrop.id);
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModal("addModal");
      closeModal("detailsModal");
    }
  });

  els.pinForm.addEventListener("submit", event => {
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
    const file = els.imageInput.files?.[0] || null;
    selectedImageFile = file;
    els.imagePreview.classList.add("hidden");
    els.imagePreview.removeAttribute("src");
    clearFormError();

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showFormError("Please choose an image file.");
      els.imageInput.value = "";
      selectedImageFile = null;
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showFormError("Please choose an image smaller than 5 MB.");
      els.imageInput.value = "";
      selectedImageFile = null;
      return;
    }

    els.imagePreview.src = URL.createObjectURL(file);
    els.imagePreview.classList.remove("hidden");
  });

  els.customerForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;
    clearFormError();

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

    busy = true;
    const submitButton = els.customerForm.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }

    let uploadedPath = null;
    try {
      if (!currentUser) throw new Error("Please sign in again.");

      if (selectedImageFile) uploadedPath = await uploadImage(selectedImageFile);

      const payload = {
        name,
        phone,
        measurements,
        notes: $("customerNotes").value.trim(),
        image_url: uploadedPath
      };

      const { error } = await db.from("customers").insert(payload);
      if (error) throw error;

      closeModal("addModal");
      els.search.value = "";
      await fetchCustomers();
      showToast("Customer saved to the cloud.");
    } catch (error) {
      if (uploadedPath) {
        await db.storage.from(IMAGE_BUCKET).remove([uploadedPath]);
      }
      showFormError(error.message || "Could not save the customer. Please try again.");
    } finally {
      busy = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save customer";
      }
    }
  });

  els.deleteButton.addEventListener("click", async () => {
    if (!activeCustomerId || busy) return;

    const customer = customers.find(c => c.id === activeCustomerId);
    if (!customer) return;

    const pin = window.prompt("Enter the 4-digit PIN to delete this customer record:");
    if (pin === null) return;
    if (pin !== ADD_CUSTOMER_PIN) {
      window.alert("Incorrect PIN. The record was not deleted.");
      return;
    }
    if (!window.confirm(`Delete the record for ${customer.name}? This cannot be undone.`)) return;

    busy = true;
    try {
      const { error } = await db.from("customers")
        .delete()
        .eq("id", activeCustomerId);
      if (error) throw error;

      if (customer.imagePath) {
        const { error: storageError } = await db.storage
          .from(IMAGE_BUCKET).remove([customer.imagePath]);
        if (storageError) console.warn("Image cleanup failed:", storageError.message);
      }

      activeCustomerId = null;
      closeModal("detailsModal");
      await fetchCustomers();
      showToast("Customer record deleted.");
    } catch (error) {
      window.alert(error.message || "Could not delete the record.");
    } finally {
      busy = false;
    }
  });

  $("snLoginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const errorBox = $("snLoginError");
    const status = $("snLoginStatus");
    const button = $("snLoginButton");
    errorBox.textContent = "";
    status.textContent = "Signing in...";
    button.disabled = true;

    try {
      const email = $("snEmail").value.trim();
      const password = $("snPassword").value;
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await activateSession(data.user);
    } catch (error) {
      errorBox.textContent = error.message || "Sign-in failed.";
      status.textContent = "";
    } finally {
      button.disabled = false;
    }
  });

  $("snSignOut").addEventListener("click", async () => {
    const { error } = await db.auth.signOut();
    if (error) {
      showToast(error.message);
      return;
    }
    currentUser = null;
    customers = [];
    els.app.classList.add("hidden");
    accountBar.classList.add("hidden");
    loginWrap.classList.remove("hidden");
  });

  async function activateSession(user) {
    currentUser = user;
    $("snAccountEmail").textContent = user.email || "Signed in";
    loginWrap.classList.add("hidden");
    accountBar.classList.remove("hidden");
    els.app.classList.remove("hidden");
    try {
      await fetchCustomers();
    } catch (error) {
      showToast("Could not load cloud records: " + (error.message || "Please try again."));
      console.error(error);
    }
  }

  // Offer a one-time import of records previously saved in this browser.
  async function offerLocalImport() {
    let oldRecords = [];
    try {
      oldRecords = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (_) {}
    if (!Array.isArray(oldRecords) || oldRecords.length === 0) return;

    const key = `stitchnote_imported_${currentUser.id}`;
    if (localStorage.getItem(key)) return;

    const shouldImport = window.confirm(
      `Found ${oldRecords.length} old record(s) saved only in this browser. Import them into your cloud account?`
    );
    if (!shouldImport) return;

    let imported = 0;
    for (const old of oldRecords) {
      let imagePath = null;
      try {
        // Older images were saved as data URLs. Convert them back to files for cloud storage.
        if (old.image && old.image.startsWith("data:image/")) {
          const response = await fetch(old.image);
          const blob = await response.blob();
          const file = new File([blob], "imported-image", { type: blob.type });
          imagePath = await uploadImage(file);
        }

        const { error } = await db.from("customers").insert({
          name: old.name || "Unnamed customer",
          phone: old.phone || "",
          measurements: old.measurements || {},
          notes: old.notes || "",
          image_url: imagePath,
          created_at: old.createdAt || new Date().toISOString()
        });
        if (error) throw error;
        imported++;
      } catch (error) {
        console.error("Could not import one record:", error);
      }
    }

    localStorage.setItem(key, "yes");
    await fetchCustomers();
    showToast(`Imported ${imported} of ${oldRecords.length} record(s).`);
  }

  async function start() {
    renderFixedMeasurements();
    els.app.classList.add("hidden");
    accountBar.classList.add("hidden");
    loginWrap.classList.remove("hidden");

    const { data, error } = await db.auth.getSession();
    if (error) {
      $("snLoginError").textContent = error.message;
      return;
    }

    if (data.session?.user) {
      await activateSession(data.session.user);
      await offerLocalImport();
    }

    db.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Avoid duplicate activation when the sign-in handler already did it.
        if (!currentUser || currentUser.id !== session.user.id) {
          activateSession(session.user);
        }
      }
      if (event === "SIGNED_OUT") {
        currentUser = null;
        customers = [];
        els.app.classList.add("hidden");
        accountBar.classList.add("hidden");
        loginWrap.classList.remove("hidden");
      }
    });
  }

  start();
})();
