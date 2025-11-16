const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_DASHBOARD_API_BASE || "/api";
let dashboardInitialized = false;

export function initializeDashboard(serverConfig = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (dashboardInitialized) {
    return;
  }

  dashboardInitialized = true;

  const apiBase =
    (typeof window !== "undefined" && window.__DASHBOARD_API_BASE_URL) ||
    DEFAULT_API_BASE;
  const {
    userPoolId = "",
    clientId = "",
    bucketName = "not-configured",
    testTableName = "Not configured",
    dashboardUsers = [],
    dashboardS3File = {},
  } = serverConfig || {};

  const defaultS3File = {
    key: dashboardS3File.key || "test-reports/encounter-a.json",
    body: dashboardS3File.body || {},
    contentType: dashboardS3File.contentType || "application/json",
  };

  const state = {
    token: window.localStorage.getItem("revclear-token") || "",
    userEmail: "",
  };
  let statusPollTimer = null;

  const userBar = document.getElementById("user-bar");
  const userEmailLabel = document.getElementById("user-email");
  const logoutButton = document.getElementById("logout-button");
  const servicePanelWrapper = document.querySelector(".service-panels");
  const servicePanels = Array.from(
    document.querySelectorAll("[data-service-panel]")
  );
  const panelButtons = Array.from(
    document.querySelectorAll("[data-open-panel]")
  );
  const closePanelButtons = Array.from(
    document.querySelectorAll("[data-close-panel]")
  );
  let activePanelKey = null;
  const authPanel = document.getElementById("auth-panel");
  const authGate = document.getElementById("auth-gate");
  const authStatus = document.getElementById("auth-status");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const loginEmailInput = loginForm
    ? loginForm.querySelector("input[name='email']")
    : null;
  const signupEmailInput = signupForm
    ? signupForm.querySelector("input[name='email']")
    : null;
  const authForms = {
    login: loginForm,
    signup: signupForm,
  };
  const authTitles = {
    login: document.querySelector("[data-form-title='login']"),
    signup: document.querySelector("[data-form-title='signup']"),
  };
  const showSignupButton = document.getElementById("showSignup");
  const showLoginButton = document.getElementById("showLogin");

  const logContainer = document.getElementById("logEntries");
  const statusRefreshButton = document.getElementById("status-refresh");
  const cognitoCheckButton = document.getElementById("cognito-check");
  const cognitoCheckIndicator = document.getElementById(
    "cognito-check-indicator"
  );
  const cognitoCheckMessage = document.getElementById(
    "cognito-check-message"
  );
  const authRequiredSections = Array.from(
    document.querySelectorAll("[data-auth-required]")
  );
  const actionButtons = Array.from(
    document.querySelectorAll("button[data-action]")
  );
  const fileKeyInput = document.getElementById("dashboard-file-key");
  const fileBodyInput = document.getElementById("dashboard-file-body");
  const fileContentTypeInput = document.getElementById(
    "dashboard-file-contentType"
  );
  const fileMessage = document.getElementById("dashboard-file-message");
  const prefixInput = document.getElementById("s3-prefix");
  const sampleButton = document.getElementById("generate-sample-file");
  const actionStatus = document.getElementById("s3-action-status");
  const listOutput = document.getElementById("s3-list-output");
  const listDeleteHandlers = [];

  const statusPills = {
    awsCognito: Array.from(
      document.querySelectorAll("[data-card-status='awsCognito']")
    ),
    awsS3: Array.from(
      document.querySelectorAll("[data-card-status='awsS3']")
    ),
    awsDynamoDb: Array.from(
      document.querySelectorAll("[data-card-status='awsDynamoDb']")
    ),
    awsEncryption: Array.from(
      document.querySelectorAll("[data-card-status='awsEncryption']")
    ),
  };

  hydrateStaticContent();

  const s3ActionFactories = {
    upload: () => ({
      label: "S3 Upload",
      method: "POST",
      path: "/dashboard/s3/upload",
      body: {
        key: defaultS3File.key,
        body: defaultS3File.body,
        contentType: defaultS3File.contentType,
      },
    }),
    list: () => ({
      label: "S3 List",
      method: "GET",
      path: "/dashboard/s3/list",
      query: { prefix: getListPrefix() },
    }),
    delete: () => ({
      label: "S3 Delete",
      method: "DELETE",
      path: "/dashboard/s3/object",
      body: { key: defaultS3File.key },
    }),
  };

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      handleForm(event, "signin", "Login");
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", function (event) {
      handleForm(event, "signup", "Signup");
    });
  }

  if (statusRefreshButton) {
    statusRefreshButton.addEventListener("click", function () {
      fetchStatus();
    });
  }

  actionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const actionKey =
        button.dataset.action && button.dataset.action.split(":")[1];
      runS3Action(actionKey);
    });
  });

  if (showSignupButton) {
    showSignupButton.addEventListener("click", function () {
      switchAuthView("signup");
    });
  }

  if (showLoginButton) {
    showLoginButton.addEventListener("click", function () {
      switchAuthView("login");
    });
  }

  panelButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      openServicePanel(button.dataset.openPanel);
    });
  });

  closePanelButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      closeServicePanels();
    });
  });

  if (cognitoCheckButton) {
    cognitoCheckButton.addEventListener(
      "click",
      handleCognitoConnectivityCheck
    );
  }

  switchAuthView("login");

  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      performLogout("You have been signed out.");
    });
  }

  if (state.token) {
    applyAuthTokens({ IdToken: state.token });
  } else {
    setAuthStatus("Local test mode — not signed in.");
    updateButtons();
    toggleAuthSections(false);
    setAuthFormsVisible(true);
    setUserBarVisible(false);
  }
  setCognitoCheckState("idle");

  function hydrateStaticContent() {
    const usersTarget = document.getElementById("dashboard-users");
    const bucketTarget = document.getElementById("s3-bucket-name");
    const poolTarget = document.getElementById("cognito-pool");
    const clientTarget = document.getElementById("cognito-client");
    const tableTarget = document.getElementById("dynamodb-table");

    if (usersTarget) {
      usersTarget.textContent = JSON.stringify(dashboardUsers, null, 2);
    }
    if (fileKeyInput) {
      fileKeyInput.value = defaultS3File.key;
      fileKeyInput.addEventListener("input", () => syncFileEditor(false));
    }
    if (fileContentTypeInput) {
      fileContentTypeInput.value = defaultS3File.contentType;
      fileContentTypeInput.addEventListener("input", () => syncFileEditor(false));
    }
    if (fileBodyInput) {
      fileBodyInput.value = JSON.stringify(defaultS3File.body, null, 2);
      fileBodyInput.addEventListener("input", () => syncFileEditor(true));
    }
    if (prefixInput) {
      prefixInput.value = deriveDefaultPrefix();
    }
    setFileMessage("Object body ready.", false);
    setActionStatus("Ready to run S3 helpers.", null);
    if (sampleButton) {
      sampleButton.addEventListener("click", () => {
        populateSampleEncounter();
      });
    }
    if (bucketTarget) {
      bucketTarget.textContent = bucketName || "not-configured";
    }
    if (poolTarget) {
      poolTarget.textContent = userPoolId || "unknown";
    }
    if (clientTarget) {
      clientTarget.textContent = clientId || "unknown";
    }
    if (tableTarget) {
      tableTarget.textContent = testTableName || "Not configured";
    }
  }

  function log(message, type, details) {
    if (!logContainer) return;
    const entry = document.createElement("div");
    entry.className = "log-entry " + (type || "info");
    const timestamp = new Date().toISOString();
    entry.innerHTML = "<strong>[" + timestamp + "] " + sanitizeMessage(message, details) + "</strong>";
    logContainer.prepend(entry);
    while (logContainer.childElementCount > 12) {
      logContainer.removeChild(logContainer.lastChild);
    }
  }

  function sanitizeMessage(message, details) {
    const base = message || "Event";
    const safeDetails = sanitizePayload(details);
    if (!safeDetails || typeof safeDetails !== "object") {
      return redactString(base);
    }
    const summary = [];
    if (safeDetails.status) {
      summary.push("status=" + safeDetails.status);
    }
    if (safeDetails.message) {
      summary.push("msg=" + safeDetails.message);
    }
    if (safeDetails.health) {
      summary.push(
        "health=" +
          Object.keys(safeDetails.health)
            .map(function (key) {
              const value = safeDetails.health[key];
              const configured = value && value.configured ? "running" : "pending";
              return key + ":" + configured;
            })
            .join("|")
      );
    }
    if (!summary.length && safeDetails.error) {
      summary.push("error=" + safeDetails.error);
    }
    return redactString(base + (summary.length ? " — " + summary.join(" ") : ""));
  }

  function syncFileEditor(requireBody) {
    if (fileKeyInput) {
      const trimmedKey = fileKeyInput.value.trim();
      defaultS3File.key =
        trimmedKey || dashboardS3File.key || "test-reports/encounter-a.json";
      if (!trimmedKey) {
        fileKeyInput.value = defaultS3File.key;
      }
    }
    if (fileContentTypeInput) {
      const trimmedType = fileContentTypeInput.value.trim();
      defaultS3File.contentType = trimmedType || "application/json";
      if (!trimmedType) {
        fileContentTypeInput.value = defaultS3File.contentType;
      }
    }
    if (!requireBody || !fileBodyInput) {
      return true;
    }
    const rawBody = fileBodyInput.value.trim();
    if (!rawBody) {
      setFileMessage("Provide JSON for the object body before uploading.", true);
      return false;
    }
    try {
      defaultS3File.body = JSON.parse(rawBody);
      setFileMessage("Object body ready.", false);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown JSON error";
      setFileMessage("Invalid JSON: " + message, true);
      return false;
    }
  }

  function setFileMessage(text, isError) {
    if (!fileMessage) return;
    fileMessage.textContent = text;
    fileMessage.classList.toggle("error", Boolean(isError));
  }

  function setActionStatus(text, isError) {
    if (!actionStatus) return;
    actionStatus.textContent = text;
    actionStatus.classList.remove("success", "error");
    if (isError === true) {
      actionStatus.classList.add("error");
    } else if (isError === false) {
      actionStatus.classList.add("success");
    }
  }

  function deriveDefaultPrefix() {
    if (defaultS3File.key.includes("/")) {
      return defaultS3File.key.replace(/[^/]+$/, "") || "test-reports/";
    }
    return "test-reports/";
  }

  function getListPrefix() {
    if (prefixInput && prefixInput.value.trim()) {
      return prefixInput.value.trim();
    }
    return deriveDefaultPrefix();
  }

  function populateSampleEncounter() {
    const encounter = createSampleEncounter();
    const sampleKey = `test-reports/${encounter.patientId}-${encounter.encounterDate}.json`;
    if (fileKeyInput) {
      fileKeyInput.value = sampleKey;
    }
    if (fileBodyInput) {
      fileBodyInput.value = JSON.stringify(encounter, null, 2);
    }
    if (fileContentTypeInput) {
      fileContentTypeInput.value = "application/json";
    }
    if (prefixInput) {
      prefixInput.value = deriveDefaultPrefix();
    }
    syncFileEditor(true);
    setFileMessage("Sample encounter ready to upload.", false);
    log("Sample encounter populated into the editor.", "success");
    setActionStatus(`Sample JSON prepared (${sampleKey})`, false);
  }

  function createSampleEncounter() {
    const clinics = ["Clinic_A", "Clinic_B", "Clinic_C"];
    const states = ["draft", "finalized", "submitted"];
    const clinic = clinics[Math.floor(Math.random() * clinics.length)];
    const patientId = `patient-${Math.floor(Math.random() * 900 + 100)}`;
    const encounterDate = new Date().toISOString().slice(0, 10);
    return {
      patientId,
      encounterDate,
      clinic,
      status: states[Math.floor(Math.random() * states.length)],
      totalCharge: Number((Math.random() * 500 + 150).toFixed(2)),
      note: `Encounter generated at ${new Date().toISOString()}`,
      procedures: [
        {
          code: "99213",
          description: "Office/outpatient visit",
          amount: 125.0,
        },
        {
          code: "93000",
          description: "Electrocardiogram",
          amount: 90.0,
        },
      ],
    };
  }

  function updateListResults(payload) {
    if (!listOutput) return;
    listOutput.innerHTML = "";
    while (listDeleteHandlers.length) {
      const detach = listDeleteHandlers.pop();
      if (detach) detach();
    }
    const items = payload?.result?.Contents;
    if (!items || !items.length) {
      const li = document.createElement("li");
      li.textContent = "No files found for this prefix.";
      listOutput.appendChild(li);
      return;
    }
    items.slice(0, 8).forEach(function (item) {
      const key = item.Key || "";
      const size = item.Size ? Math.round(Number(item.Size) / 1024) + " KB" : "";
      const li = document.createElement("li");
      li.className = "s3-list-item";
      li.dataset.key = key;
      const info = document.createElement("div");
      info.className = "s3-list-info";
      const keyNode = document.createElement("span");
      keyNode.textContent = key || "(unknown)";
      info.appendChild(keyNode);
      if (size) {
        const sizeNode = document.createElement("span");
        sizeNode.className = "s3-list-meta";
        sizeNode.textContent = size;
        info.appendChild(sizeNode);
      }
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "s3-trash-btn";
      deleteBtn.textContent = "🗑️";
      const handler = function () {
        selectKeyForDeletion(key);
      };
      deleteBtn.addEventListener("click", handler);
      listDeleteHandlers.push(() => deleteBtn.removeEventListener("click", handler));
      li.appendChild(info);
      li.appendChild(deleteBtn);
      listOutput.appendChild(li);
    });
    if (items.length > 8) {
      const extra = document.createElement("li");
      extra.className = "s3-list-item";
      extra.textContent = `+${items.length - 8} more …`;
      listOutput.appendChild(extra);
    }
  }

  function selectKeyForDeletion(key) {
    if (!key) return;
    if (fileKeyInput) {
      fileKeyInput.value = key;
    }
    defaultS3File.key = key;
    setActionStatus(`Preparing to delete ${key}`, false);
    if (window.confirm(`Delete ${key}? This action removes the object from S3.`)) {
      runS3Action("delete");
    }
  }

  function removeDeletedKeyFromList(key) {
    if (!listOutput || !key) return;
    const items = Array.from(listOutput.querySelectorAll(".s3-list-item"));
    let removed = false;
    items.forEach(function (li) {
      if (removed) return;
      if (li.dataset && li.dataset.key === key) {
        listOutput.removeChild(li);
        removed = true;
      }
    });
    if (!listOutput.children.length) {
      const empty = document.createElement("li");
      empty.textContent = "No files found for this prefix.";
      listOutput.appendChild(empty);
    }
  }

  function updateButtons() {
    const enabled = Boolean(state.token);
    actionButtons.forEach(function (btn) {
      btn.disabled = !enabled;
    });
  }

  function setAuthStatus(text) {
    if (authStatus) {
      authStatus.textContent = text;
    }
  }

  function setAuthFormsVisible(visible) {
    if (authPanel) {
      authPanel.classList.toggle("hidden", !visible);
    }
  }

  function setUserBarVisible(visible) {
    if (userBar) {
      userBar.classList.toggle("hidden", !visible);
    }
  }

  function toggleAuthSections(enabled) {
    authRequiredSections.forEach(function (section) {
      section.classList.toggle("hidden", !enabled);
    });
    if (authGate) {
      authGate.classList.toggle("hidden", enabled);
    }
  }

  function openServicePanel(key) {
    if (!servicePanelWrapper || !key) return;
    activePanelKey = key;
    servicePanelWrapper.classList.remove("hidden");
    servicePanels.forEach(function (panel) {
      panel.classList.toggle("hidden", panel.dataset.servicePanel !== key);
    });
    servicePanelWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeServicePanels() {
    if (!servicePanelWrapper) return;
    activePanelKey = null;
    servicePanelWrapper.classList.add("hidden");
    servicePanels.forEach(function (panel) {
      panel.classList.add("hidden");
    });
  }

  function ensureStatusPolling() {
    if (statusPollTimer) {
      return;
    }
    statusPollTimer = window.setInterval(function () {
      fetchStatus();
    }, 60000);
  }

  function stopStatusPolling() {
    if (!statusPollTimer) {
      return;
    }
    window.clearInterval(statusPollTimer);
    statusPollTimer = null;
  }

  function applyAuthTokens(authenticationResult) {
    if (!authenticationResult || !authenticationResult.IdToken) {
      return false;
    }
    var idToken = authenticationResult.IdToken;
    if (!idToken) {
      return false;
    }
    state.token = idToken;
    window.localStorage.setItem("revclear-token", idToken);
    state.userEmail = decodeEmailFromToken(idToken);
    setAuthStatus("Authenticated — AWS helpers unlocked.");
    updateUserBar();
    updateButtons();
    toggleAuthSections(true);
    setAuthFormsVisible(false);
    if (activePanelKey) {
      openServicePanel(activePanelKey);
    } else {
      closeServicePanels();
    }
    fetchStatus();
    ensureStatusPolling();
    return true;
  }

  function applyServiceBadge(key, health) {
    const pills = statusPills[key] || [];
    if (!pills.length) return;
    var text = "In Progress";
    var clazz = "warning";
    if (health && health.configured) {
      text = "Running";
      clazz = "running";
    }
    pills.forEach(function (pill) {
      pill.textContent = text;
      pill.className = "pill " + clazz;
    });
  }

  async function fetchStatus() {
    if (!state.token) {
      log("Cannot fetch status without authentication.", "error");
      return;
    }

    try {
      const res = await fetch(apiBase + "/dashboard/status", {
        headers: {
          Authorization: "Bearer " + state.token,
        },
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "HTTP " + res.status);
      }
      const health = payload.health || {};
      applyServiceBadge("awsS3", health.awsS3);
      applyServiceBadge("awsCognito", health.awsCognito);
      applyServiceBadge("awsDynamoDb", health.awsDynamoDb);
      applyServiceBadge("awsEncryption", health.awsEncryption);
      updateCognitoConnection(health.awsCognito);
      log("Status refresh succeeded.", "success", health);
    } catch (err) {
      log("Failed to refresh /dashboard/status", "error", err);
      if (err && err.message && err.message.indexOf("Unauthorized") !== -1) {
        performLogout("Session expired — sign in again to run AWS helpers.");
      }
      updateCognitoConnection({
        configured: false,
        userPoolId,
        clientId,
        error: err && err.message ? err.message : "Failed to reach /dashboard/status.",
      });
    }
  }

  async function runS3Action(key) {
    const actionFactory = key ? s3ActionFactories[key] : undefined;
    if (!actionFactory) return;
    const skipBodyValidation = key !== "upload";
    if (!syncFileEditor(!skipBodyValidation)) {
      log("S3 helper aborted — fix the object editor and retry.", "error");
      setActionStatus("Object body invalid — fix JSON before running helpers.", true);
      return;
    }
    const action = actionFactory();

    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + state.token,
    };
    const options = {
      method: action.method,
      headers: headers,
    };

    var url = apiBase + action.path;
    if (action.query) {
      const query = new URLSearchParams(action.query).toString();
      url = url + "?" + query;
    }

    if (action.body && action.method !== "GET") {
      options.body = JSON.stringify(action.body);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json().catch(function () {
        return {};
      });
      const status = response.ok ? "success" : "error";
      const summary =
        action.label +
        " " +
        (response.ok ? "OK" : "ERROR") +
        " (HTTP " +
        response.status +
        ")";
      log(summary, status, {
        request: { url: url, method: action.method, body: options.body },
        response: result,
      });
      setActionStatus(summary, !response.ok);
      if (response.ok) {
        if (key === "list") {
          updateListResults(result);
        }
        if (key === "delete") {
          removeDeletedKeyFromList(action.body?.key);
        }
        fetchStatus();
      }
    } catch (error) {
      log(action.label + " failed", "error", error);
      setActionStatus(action.label + " failed — check server logs.", true);
    }
  }

  function handleForm(event, endpoint, successText) {
    event.preventDefault();
    var form = event.target;
    var formData = new FormData(form);
    var body = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    fetch(apiBase + "/auth/" + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().then(function (payload) {
          return { ok: res.ok, payload: payload, status: res.status };
        });
      })
      .then(function (_ref) {
        var ok = _ref.ok;
        var payload = _ref.payload;
        var status = _ref.status;
        if (ok && payload && payload.AuthenticationResult) {
          applyAuthTokens(payload.AuthenticationResult);
        }
        log(successText + " (HTTP " + status + ")", ok ? "success" : "error", payload);
      })
      .catch(function (error) {
        log(successText + " request failed", "error", error);
      });
  }

  function switchAuthView(target) {
    var desired = target === "signup" ? "signup" : "login";
    Object.keys(authForms).forEach(function (key) {
      var form = authForms[key];
      var title = authTitles[key];
      if (form) {
        form.classList.toggle("hidden", key !== desired);
      }
      if (title) {
        title.classList.toggle("hidden", key !== desired);
      }
    });
    if (desired === "signup" && signupEmailInput) {
      signupEmailInput.focus();
    }
    if (desired === "login" && loginEmailInput) {
      loginEmailInput.focus();
    }
  }

  function decodeEmailFromToken(token) {
    try {
      const segments = token.split(".");
      if (segments.length < 2) return "";
      const normalized = segments[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(
        decodeURIComponent(
          atob(normalized)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
        )
      );
      return payload.email || payload["cognito:username"] || payload.sub || "";
    } catch (error) {
      console.warn("Failed to decode token payload:", error);
      return "";
    }
  }

  function updateUserBar() {
    if (userEmailLabel) {
      userEmailLabel.textContent =
        state.userEmail || "Authenticated tester (email unavailable)";
    }
    setUserBarVisible(Boolean(state.token));
  }

  function updateCognitoConnection(health) {
    const callout = document.getElementById("cognito-connection");
    const statusText = document.getElementById("cognito-status-text");
    const detailText = document.getElementById("cognito-status-details");
    if (!callout || !statusText || !detailText) {
      return;
    }

    if (health && health.configured) {
      callout.classList.remove("neutral", "error");
      callout.classList.add("success");
      statusText.textContent = "Connected to Cognito successfully.";
      detailText.textContent =
        "Tokens issued by this pool will unlock the protected AWS helpers. Watch the log panel for individual request results.";
    } else {
      callout.classList.remove("neutral", "success");
      callout.classList.add("error");
      const missing = [];
      if (!health || !health.userPoolId) missing.push("AWS_USER_POOL_ID");
      if (!health || !health.clientId) missing.push("AWS_CLIENT_ID");
      statusText.textContent = "Connection failed.";
      if (missing.length) {
        detailText.textContent =
          "Missing environment variables: " +
          missing.join(", ") +
          ". Update RevClear/backend/.env and restart the server.";
      } else if (health && health.error) {
        detailText.textContent = health.error;
      } else {
        detailText.textContent =
          "The dashboard could not reach Cognito. Double-check AWS credentials and network access.";
      }
    }
  }

  async function handleCognitoConnectivityCheck() {
    if (!state.token) {
      setCognitoCheckState("error", "Sign in to test connectivity.");
      return;
    }
    setCognitoCheckState("loading", "Checking Cognito…");
    if (cognitoCheckButton) {
      cognitoCheckButton.disabled = true;
    }
    try {
      const res = await fetch(apiBase + "/dashboard/cognito/check", {
        headers: {
          Authorization: "Bearer " + state.token,
        },
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "HTTP " + res.status);
      }
      updateCognitoConnection({
        configured: true,
        userPoolId: payload.metadata?.userPoolId,
        clientId: payload.metadata?.clientId,
      });
      setCognitoCheckState("success", "Cognito responded successfully.");
      log("Cognito connectivity check succeeded.", "success", payload.result);
    } catch (error) {
      const errMsg =
        (error && error.message) || "Unable to connect to Cognito.";
      setCognitoCheckState("error", errMsg);
      log("Cognito connectivity check failed.", "error", error);
      updateCognitoConnection({
        configured: false,
        userPoolId,
        clientId,
        error: errMsg,
      });
    } finally {
      if (cognitoCheckButton) {
        cognitoCheckButton.disabled = false;
      }
    }
  }

  function setCognitoCheckState(state, message) {
    if (!cognitoCheckIndicator || !cognitoCheckMessage) {
      return;
    }
    cognitoCheckIndicator.classList.remove(
      "hidden",
      "loading",
      "success",
      "error"
    );
    if (state === "idle") {
      cognitoCheckIndicator.classList.add("hidden");
    } else {
      cognitoCheckIndicator.classList.add(state);
    }
    if (message) {
      cognitoCheckMessage.textContent = message;
    }
  }

  function performLogout(statusMessage) {
    state.token = "";
    state.userEmail = "";
    window.localStorage.removeItem("revclear-token");
    if (statusMessage) {
      setAuthStatus(statusMessage);
    } else {
      setAuthStatus("Local test mode — not signed in.");
    }
    updateButtons();
    toggleAuthSections(false);
    setAuthFormsVisible(true);
    setUserBarVisible(false);
    stopStatusPolling();
    setCognitoCheckState("idle");
    closeServicePanels();
  }

  function sanitizePayload(payload) {
    if (payload === null || payload === undefined) {
      return payload;
    }
    if (Array.isArray(payload)) {
      return payload.map(sanitizePayload);
    }
    if (typeof payload === "object") {
      const clone = {};
      Object.keys(payload).forEach(function (key) {
        const value = payload[key];
        if (value && typeof value === "object") {
          clone[key] = sanitizePayload(value);
        } else if (
          shouldRedactKey(key) ||
          looksLikeJwt(value) ||
          looksLikeCredential(value)
        ) {
          clone[key] = redactValue(value);
        } else {
          clone[key] = value;
        }
      });
      return clone;
    }
    if (looksLikeJwt(payload) || looksLikeCredential(payload)) {
      return redactValue(payload);
    }
    return payload;
  }

  function shouldRedactKey(key) {
    if (!key) return false;
    const normalized = key.toLowerCase();
    return [
      "accesstoken",
      "idtoken",
      "refreshtoken",
      "authorization",
      "token",
      "password",
      "secret",
      "clientsecret",
      "email",
    ].includes(normalized);
  }

  function looksLikeJwt(value) {
    if (typeof value !== "string") return false;
    return value.startsWith("eyJ") && value.split(".").length >= 2;
  }

  function looksLikeCredential(value) {
    if (typeof value !== "string") return false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value);
  }

  function redactValue(_value) {
    return "[redacted]";
  }

  function redactString(value) {
    if (typeof value !== "string") {
      return "[redacted]";
    }
    return value.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted]");
  }
}
