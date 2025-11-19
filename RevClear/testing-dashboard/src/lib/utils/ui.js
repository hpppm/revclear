import { log } from './logger'; // UI functions might need to log

/**
 * Manages the UI state and interactions for the dashboard.
 * Functions here directly manipulate the DOM based on application state.
 */
export function createUIHandlers(elements, state, callbacks) {
  const {
    userBar, userEmailLabel, logoutButton, servicePanelWrapper, servicePanels,
    authPanel, authGate, authStatus, loginForm, signupForm,
    loginEmailInput, signupEmailInput, authForms, authTitles,
    showSignupButton, showLoginButton, logContainer, statusRefreshButton,
    cognitoCheckButton, cognitoCheckIndicator, cognitoCheckMessage,
    authRequiredSections, actionButtons, fileKeyInput, fileBodyInput,
    fileContentTypeInput, fileMessage, prefixInput, sampleButton,
    actionStatus, listOutput, statusPills
  } = elements;

  // Internal state for UI handlers
  let activePanelKey = null;
  const listDeleteHandlers = []; // This needs to be managed locally or passed in

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
        // This function will need to be passed from dashboardClient or refactored
        // selectKeyForDeletion(key); - this now comes from callbacks
        callbacks.selectKeyForDeletion(key);
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

  // Exposed API
  return {
    setAuthStatus,
    setAuthFormsVisible,
    setUserBarVisible,
    toggleAuthSections,
    openServicePanel,
    closeServicePanels,
    setFileMessage,
    setActionStatus,
    updateListResults,
    removeDeletedKeyFromList,
    updateButtons,
    updateUserBar,
    updateCognitoConnection,
    setCognitoCheckState,
    // performLogout needs to be passed state management (token etc.)
    // applyAuthTokens needs state management (token etc.)
  };
}
