// ==========================================================================
// RAA Admin Portal - Client Controller
// ==========================================================================

const firebaseConfig = {
  apiKey: "AIzaSyBIHiLX8wlnK_y8NrM3em6WVsTf1OsQ4y0",
  authDomain: "recabn-alumni-association.firebaseapp.com",
  projectId: "recabn-alumni-association",
  storageBucket: "recabn-alumni-association.firebasestorage.app",
  messagingSenderId: "1098317173887",
  appId: "1:1098317173887:web:84ed2db3f871a494e25b4a",
  measurementId: "G-09N396J5J5"
};

// Initialize Firebase
let db = null;
let auth = null;
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();
  console.log("Firebase initialized for Admin Portal");
} catch (error) {
  console.error("Initialization error:", error);
}

// Global data stores
let allRegistrations = [];
let allMessages = [];
let activeTab = "registrations";
let currentViewedItem = null;

// DOM Elements
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const loginErrorBanner = document.getElementById("login-error-banner");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const displayUserEmail = document.getElementById("display-user-email");
const toastContainer = document.getElementById("toast-container");

// Stats elements
const statTotalReg = document.getElementById("stat-total-reg");
const statApprovedReg = document.getElementById("stat-approved-reg");
const statPendingReg = document.getElementById("stat-pending-reg");
const statTotalMessages = document.getElementById("stat-total-messages");

// Tables & Content
const regTableBody = document.getElementById("registrations-table-body");
const msgTableBody = document.getElementById("messages-table-body");

// Modal
const detailModal = document.getElementById("detail-modal");
const modalAlumniName = document.getElementById("modal-alumni-name");
const modalDetailBody = document.getElementById("modal-detail-body");
const modalFooterActions = document.getElementById("modal-footer-actions");

// Toast Notifications Helper
function showToast(message, type = "success") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}"></i>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Firebase Auth State Observer
auth.onAuthStateChanged((user) => {
  if (user) {
    // Admin is logged in
    loginSection.style.display = "none";
    dashboardSection.style.display = "flex";
    displayUserEmail.textContent = user.email;
    showToast("Access granted. Session initialized.", "success");
    startDataListeners();
  } else {
    // No user logged in
    dashboardSection.style.display = "none";
    loginSection.style.display = "flex";
    stopDataListeners();
  }
});

// Login Form Handler
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginErrorBanner.style.display = "none";
    loginErrorBanner.textContent = "";

    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value;

    loginBtn.disabled = true;
    loginBtn.classList.add("loading");
    loginBtn.querySelector("span").textContent = "Verifying Credentials...";

    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      console.error("Login failure:", error);
      loginErrorBanner.textContent = "Invalid administrator credentials or access denied.";
      loginErrorBanner.style.display = "block";
    } finally {
      loginBtn.disabled = false;
      loginBtn.classList.remove("loading");
      loginBtn.querySelector("span").textContent = "Access Dashboard";
    }
  });
}

// Logout Handler
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      showToast("Signed out successfully.", "info");
    } catch (error) {
      console.error("Logout error:", error);
    }
  });
}

// Switch Tabs
window.switchTab = function(tabName) {
  activeTab = tabName;
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
  
  if (tabName === "registrations") {
    document.getElementById("tab-btn-reg").classList.add("active");
    document.getElementById("content-registrations").classList.add("active");
  } else if (tabName === "messages") {
    document.getElementById("tab-btn-msg").classList.add("active");
    document.getElementById("content-messages").classList.add("active");
  } else if (tabName === "analytics") {
    document.getElementById("tab-btn-charts").classList.add("active");
    document.getElementById("content-analytics").classList.add("active");
    renderCharts();
  }
};

// Firestore subscriptions
let unsubscribeRegistrations = null;
let unsubscribeMessages = null;

function startDataListeners() {
  // Listen for Registrations
  unsubscribeRegistrations = db.collection("alumni_registrations")
    .orderBy("submittedAt", "desc")
    .onSnapshot((snapshot) => {
      allRegistrations = [];
      snapshot.forEach(doc => {
        allRegistrations.push({ id: doc.id, ...doc.data() });
      });
      updateStats();
      applyRegFilters();
      if (activeTab === "analytics") {
        renderCharts();
      }
    }, (error) => {
      console.error("Firestore registrations subscription failed:", error);
      showToast("Access Denied: Insufficient privileges.", "error");
    });

  // Listen for Contact Messages
  unsubscribeMessages = db.collection("contact_messages")
    .orderBy("submittedAt", "desc")
    .onSnapshot((snapshot) => {
      allMessages = [];
      snapshot.forEach(doc => {
        allMessages.push({ id: doc.id, ...doc.data() });
      });
      updateStats();
      renderMessages(allMessages);
    }, (error) => {
      console.error("Firestore messages subscription failed:", error);
    });
}

function stopDataListeners() {
  if (unsubscribeRegistrations) {
    unsubscribeRegistrations();
    unsubscribeRegistrations = null;
  }
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  allRegistrations = [];
  allMessages = [];
}

// Update Dashboard Header Cards
function updateStats() {
  const total = allRegistrations.length;
  const approved = allRegistrations.filter(r => r.status === "Approved").length;
  const pending = allRegistrations.filter(r => r.status === "Pending" || !r.status).length;
  const messages = allMessages.length;

  if (statTotalReg) statTotalReg.textContent = total;
  if (statApprovedReg) statApprovedReg.textContent = approved;
  if (statPendingReg) statPendingReg.textContent = pending;
  if (statTotalMessages) statTotalMessages.textContent = messages;
}

// Client-side filtering & search
window.applyRegFilters = function() {
  const query = document.getElementById("reg-search").value.toLowerCase().trim();
  const batch = document.getElementById("filter-batch").value;
  const branch = document.getElementById("filter-branch").value;
  const status = document.getElementById("filter-status").value;

  const filtered = allRegistrations.filter(r => {
    // 1. Search term match
    const searchMatch = !query || 
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.rollNumber && r.rollNumber.toLowerCase().includes(query)) ||
      (r.email && r.email.toLowerCase().includes(query)) ||
      (r.company && r.company.toLowerCase().includes(query)) ||
      (r.designation && r.designation.toLowerCase().includes(query));

    // 2. Batch match
    const batchMatch = !batch || String(r.batch) === batch;

    // 3. Branch match
    const branchMatch = !branch || r.branch === branch;

    // 4. Status match
    let statusMatch = true;
    if (status) {
      if (status === "Pending") {
        statusMatch = r.status === "Pending" || !r.status;
      } else {
        statusMatch = r.status === status;
      }
    }

    return searchMatch && batchMatch && branchMatch && statusMatch;
  });

  renderRegistrations(filtered);
};

// Render Alumni Registrations to Table
function renderRegistrations(data) {
  if (!regTableBody) return;
  
  if (data.length === 0) {
    regTableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fa-solid fa-folder-open"></i>
            <p>No matching registration entries found.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  regTableBody.innerHTML = "";
  data.forEach(item => {
    const status = item.status || "Pending";
    let badgeClass = "pending";
    let statusLabel = "Pending Verification";
    
    if (status === "Approved") {
      badgeClass = "approved";
      statusLabel = "Approved";
    } else if (status === "Rejected") {
      badgeClass = "rejected";
      statusLabel = "Rejected";
    }

    const submittedDate = item.submittedAt ? new Date(item.submittedAt.seconds * 1000).toLocaleDateString("en-IN") : "Pending...";
    const displayAppId = item.appId || "N/A";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(item.name)}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(item.email)}</span></td>
      <td><code>${escapeHtml(item.rollNumber)}</code></td>
      <td>${escapeHtml(item.batch)} - ${escapeHtml(item.branch)}</td>
      <td>
        <span class="badge-status ${badgeClass}">
          <i class="fa-solid ${status === 'Approved' ? 'fa-circle-check' : status === 'Rejected' ? 'fa-circle-xmark' : 'fa-circle-dot'}"></i>
          ${statusLabel}
        </span>
      </td>
      <td>
        <span style="font-family: monospace; font-weight: 600;">${escapeHtml(displayAppId)}</span><br>
        <span style="font-size: 0.72rem; color: var(--text-muted);">${submittedDate}</span>
      </td>
      <td>
        <div class="action-btn-group">
          <button class="action-btn" title="View Details" onclick="viewDetails('${item.id}')">
            <i class="fa-solid fa-eye"></i>
          </button>
          ${status !== 'Approved' ? `
            <button class="action-btn btn-approve-action" title="Approve Alumni" onclick="handleQuickApprove('${item.id}')">
              <i class="fa-solid fa-check"></i>
            </button>
          ` : ''}
          <button class="action-btn btn-delete-action" title="Delete Entry" onclick="handleQuickDelete('${item.id}', 'alumni')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    regTableBody.appendChild(tr);
  });
}

// Render Messages to Table
function renderMessages(data) {
  if (!msgTableBody) return;
  
  if (data.length === 0) {
    msgTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <i class="fa-solid fa-envelope-open"></i>
            <p>No queries or messages in database.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  msgTableBody.innerHTML = "";
  data.forEach(item => {
    const submittedDate = item.submittedAt ? new Date(item.submittedAt.seconds * 1000).toLocaleString("en-IN") : "Pending...";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td><a href="mailto:${escapeHtml(item.email)}" style="color:var(--accent); text-decoration:underline;">${escapeHtml(item.email)}</a></td>
      <td><p style="margin:0; max-width:500px; white-space:pre-wrap; line-height:1.4;">${escapeHtml(item.message)}</p></td>
      <td><span style="font-size:0.75rem; color:var(--text-muted);">${submittedDate}</span></td>
      <td>
        <button class="action-btn btn-delete-action" title="Delete Inquiry" onclick="handleQuickDelete('${item.id}', 'message')">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;
    msgTableBody.appendChild(tr);
  });
}

// View Alumni Details in Modal
window.viewDetails = function(id) {
  const item = allRegistrations.find(r => r.id === id);
  if (!item) return;
  currentViewedItem = item;

  modalAlumniName.textContent = escapeHtml(item.name);
  
  const status = item.status || "Pending";
  const appStatusText = status === "Approved" ? "Approved" : status === "Rejected" ? "Rejected" : "Pending Verification";
  const badgeClass = status === "Approved" ? "approved" : status === "Rejected" ? "rejected" : "pending";

  let contributionsHtml = "None Selected";
  if (item.contributionAreas && item.contributionAreas.length > 0) {
    contributionsHtml = item.contributionAreas.map(c => `<li>${escapeHtml(c)}</li>`).join("");
  }

  const linkedinLink = item.linkedin ? `<a href="${escapeHtml(item.linkedin)}" target="_blank" rel="noopener">${escapeHtml(item.linkedin)} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : "N/A";

  modalDetailBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Status</div>
        <div class="detail-val">
          <span class="badge-status ${badgeClass}">
            <i class="fa-solid ${status === 'Approved' ? 'fa-circle-check' : status === 'Rejected' ? 'fa-circle-xmark' : 'fa-circle-dot'}"></i>
            ${appStatusText}
          </span>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Assigned App ID</div>
        <div class="detail-val" style="font-family:monospace; font-weight:bold;">${escapeHtml(item.appId || "None Generated")}</div>
      </div>
      
      <div class="detail-item">
        <div class="detail-label">Email Address</div>
        <div class="detail-val"><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a></div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Mobile Number</div>
        <div class="detail-val">${escapeHtml(item.mobileNumber || "N/A")}</div>
      </div>

      <div class="detail-item">
        <div class="detail-label">Roll Number</div>
        <div class="detail-val"><code>${escapeHtml(item.rollNumber)}</code></div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Branch & Batch</div>
        <div class="detail-val">${escapeHtml(item.branch)} (Batch of ${escapeHtml(item.batch)})</div>
      </div>

      <div class="detail-item">
        <div class="detail-label">Admission Type</div>
        <div class="detail-val">${escapeHtml(item.admissionType || "Regular")}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Current City</div>
        <div class="detail-val">${escapeHtml(item.city || "N/A")}</div>
      </div>

      <div class="detail-item">
        <div class="detail-label">Company / Organization</div>
        <div class="detail-val">${escapeHtml(item.company || "N/A")}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Designation / Role</div>
        <div class="detail-val">${escapeHtml(item.designation || "N/A")}</div>
      </div>

      <div class="detail-item full-width">
        <div class="detail-label">LinkedIn Profile</div>
        <div class="detail-val">${linkedinLink}</div>
      </div>
      
      <div class="detail-item">
        <div class="detail-label">Willing to Contribute</div>
        <div class="detail-val">${escapeHtml(item.willingToContribute)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Alumni Spotlight Opt-in</div>
        <div class="detail-val">${escapeHtml(item.spotlightOptIn || "Yes")}</div>
      </div>

      <div class="detail-item full-width">
        <div class="detail-label">Contribution Areas</div>
        <div class="detail-val">
          <ul style="margin: 6px 0 0 16px; padding: 0;">${contributionsHtml}</ul>
        </div>
      </div>
      
      <div class="detail-item">
        <div class="detail-label">WhatsApp Channel Opt-in</div>
        <div class="detail-val">${item.whatsAppOptIn ? "Yes" : "No"}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Telegram Group Opt-in</div>
        <div class="detail-val">${item.telegramOptIn ? "Yes" : "No"}</div>
      </div>
    </div>
  `;

  modalFooterActions.innerHTML = `
    ${status !== 'Approved' ? `
      <button class="btn btn-primary btn-sm" style="background-color: var(--admin-success); border-color: var(--admin-success);" onclick="executeApprove('${item.id}')">
        <i class="fa-solid fa-check"></i> Approve & Generate ID
      </button>
    ` : ''}
    ${status !== 'Rejected' ? `
      <button class="btn btn-secondary btn-sm" style="color: var(--admin-danger); border-color: var(--admin-danger);" onclick="executeReject('${item.id}')">
        <i class="fa-solid fa-xmark"></i> Reject
      </button>
    ` : ''}
    <button class="btn btn-secondary btn-sm" style="color: var(--text-sub);" onclick="closeModal()">Close</button>
  `;

  detailModal.style.display = "flex";
};

window.closeModal = function() {
  detailModal.style.display = "none";
  currentViewedItem = null;
};

// Close modal clicking outside content
window.onclick = function(event) {
  if (event.target === detailModal) {
    closeModal();
  }
};

// Database operation callbacks
window.handleQuickApprove = async function(id) {
  if (confirm("Are you sure you want to approve this alumni entry?")) {
    await executeApprove(id);
  }
};

window.executeApprove = async function(id) {
  const item = allRegistrations.find(r => r.id === id);
  if (!item) return;

  // Generate Unique Application ID: RAA-YY-RANDOM
  const batchYear = item.batch || "26";
  const yr = batchYear.toString().slice(-2);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const appId = `RAA-${yr}-${randomSuffix}`;

  try {
    await db.collection("alumni_registrations").doc(id).update({
      status: "Approved",
      appId: appId
    });
    showToast(`Approved successfully. Generated ID: ${appId}`, "success");
    
    // Queue approval email trigger
    try {
      await db.collection("mail").add({
        to: [item.email],
        message: {
          subject: "RECABN RAA: Alumni Registration Approved!",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e6eb; border-radius: 8px;">
              <div style="background-color: #0b2240; padding: 20px; border-radius: 6px 6px 0 0; text-align: center; color: white;">
                <h2 style="margin: 0; font-size: 20px; font-weight: normal;">RECABN Alumni Association</h2>
                <span style="font-size: 11px; color: #10b981; letter-spacing: 1px; text-transform: uppercase;">Application Approved</span>
              </div>
              <div style="padding: 24px; color: #333333; line-height: 1.6;">
                <p>Dear ${item.name},</p>
                <p>We are pleased to inform you that your expression of interest to join the <strong>RECABN Alumni Association (RAA)</strong> has been successfully verified and approved.</p>
                <p>Your institutional credentials match our graduate records, and your profile is now active in the registry database.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0; text-align: center;">
                  <span style="font-size: 11px; text-transform: uppercase; color: #777; display: block; margin-bottom: 4px;">Your Assigned Application ID</span>
                  <strong style="font-size: 22px; color: #0b2240; font-family: monospace;">${appId}</strong>
                </div>
                
                <p>You can use this ID alongside your registered email address to check your status at any time on the main portal.</p>
                <p>Thank you for connecting and offering your advisory support to mentor current students.</p>
                <br>
                <p style="margin-bottom: 0;">Warm regards,</p>
                <strong style="color: #0b2240;">RAA Coordination Framework</strong><br>
                <span style="font-size: 11px; color: #777;">Rajkiya Engineering College, Ambedkar Nagar</span>
              </div>
            </div>
          `
        }
      });
      console.log("Approval email queued successfully");
    } catch (mailErr) {
      console.error("Queue approval email failure:", mailErr);
    }
    
    closeModal();
  } catch (error) {
    console.error("Approve error:", error);
    showToast("Failed to approve entry.", "error");
  }
};

window.executeReject = async function(id) {
  const item = allRegistrations.find(r => r.id === id);
  if (!item) return;

  if (confirm("Are you sure you want to reject this entry?")) {
    try {
      await db.collection("alumni_registrations").doc(id).update({
        status: "Rejected"
      });
      showToast("Application marked as Rejected.", "info");

      // Queue rejection email trigger
      try {
        await db.collection("mail").add({
          to: [item.email],
          message: {
            subject: "RECABN RAA: Alumni Registry Verification Status",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e6eb; border-radius: 8px;">
                <div style="background-color: #0b2240; padding: 20px; border-radius: 6px 6px 0 0; text-align: center; color: white;">
                  <h2 style="margin: 0; font-size: 20px; font-weight: normal;">RECABN Alumni Association</h2>
                  <span style="font-size: 11px; color: #ef4444; letter-spacing: 1px; text-transform: uppercase;">Verification Update</span>
                </div>
                <div style="padding: 24px; color: #333333; line-height: 1.6;">
                  <p>Dear ${item.name},</p>
                  <p>We are writing to inform you that we could not verify your alumni registration submission against the official college graduate logs.</p>
                  <p>As a result, your expression of interest has been marked as <strong>Rejected</strong> in our preliminary database.</p>
                  <p>If you believe this is a clerical error, or if your name or roll number was listed differently on your college records, please submit a query via the contact form on the website or reach out directly to <a href="mailto:alumnicell@recabn.ac.in" style="color: #b38f44; text-decoration: none; font-weight: 600;">alumnicell@recabn.ac.in</a>.</p>
                  <br>
                  <p style="margin-bottom: 0;">Warm regards,</p>
                  <strong style="color: #0b2240;">RAA Coordination Framework</strong><br>
                  <span style="font-size: 11px; color: #777;">Rajkiya Engineering College, Ambedkar Nagar</span>
                </div>
              </div>
            `
          }
        });
        console.log("Rejection email queued successfully");
      } catch (mailErr) {
        console.error("Queue rejection email failure:", mailErr);
      }

      closeModal();
    } catch (error) {
      console.error("Reject error:", error);
      showToast("Failed to reject entry.", "error");
    }
  }
};

window.handleQuickDelete = function(id, type) {
  const label = type === "alumni" ? "registration entry" : "inquiry message";
  if (confirm(`Are you sure you want to permanently delete this ${label}? This cannot be undone.`)) {
    executeDelete(id, type);
  }
};

async function executeDelete(id, type) {
  const collectionName = type === "alumni" ? "alumni_registrations" : "contact_messages";
  try {
    await db.collection(collectionName).doc(id).delete();
    showToast("Entry permanently deleted.", "success");
    closeModal();
  } catch (error) {
    console.error("Delete error:", error);
    showToast("Failed to delete entry.", "error");
  }
}

// Utility to escape HTML and prevent XSS injection in tables
function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ==========================================================================
// Chart.js Data Visualization & CSV Export
// ==========================================================================
let chartBatchInstance = null;
let chartBranchInstance = null;
let chartStatusInstance = null;

function renderCharts() {
  if (typeof Chart === 'undefined') {
    console.error("Chart.js not loaded.");
    return;
  }

  // 1. Batch Distribution
  const batches = {};
  allRegistrations.forEach(r => {
    if (r.batch) {
      batches[r.batch] = (batches[r.batch] || 0) + 1;
    }
  });
  const batchLabels = Object.keys(batches).sort((a, b) => Number(a) - Number(b));
  const batchData = batchLabels.map(l => batches[l]);

  if (chartBatchInstance) chartBatchInstance.destroy();
  const ctxBatch = document.getElementById("chart-batch");
  if (ctxBatch) {
    chartBatchInstance = new Chart(ctxBatch.getContext("2d"), {
      type: 'bar',
      data: {
        labels: batchLabels,
        datasets: [{
          label: 'Number of Alumni',
          data: batchData,
          backgroundColor: 'rgba(179, 143, 68, 0.6)',
          borderColor: 'rgba(179, 143, 68, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  // 2. Branch Distribution
  const branches = {};
  allRegistrations.forEach(r => {
    if (r.branch) {
      branches[r.branch] = (branches[r.branch] || 0) + 1;
    }
  });
  const branchLabels = Object.keys(branches);
  const branchData = branchLabels.map(l => branches[l]);

  if (chartBranchInstance) chartBranchInstance.destroy();
  const ctxBranch = document.getElementById("chart-branch");
  if (ctxBranch) {
    chartBranchInstance = new Chart(ctxBranch.getContext("2d"), {
      type: 'doughnut',
      data: {
        labels: branchLabels,
        datasets: [{
          data: branchData,
          backgroundColor: [
            '#0b2240', // Deep Blue
            '#b38f44', // Gold
            '#1e4b82', // Accent Blue
            '#c4a45a', // Light Gold
            '#7b8fa3'  // Grey/Blue
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  // 3. Current Status breakdown
  const statuses = {};
  allRegistrations.forEach(r => {
    const status = r.currentStatus || "Other";
    statuses[status] = (statuses[status] || 0) + 1;
  });
  const statusLabels = Object.keys(statuses);
  const statusData = statusLabels.map(l => statuses[l]);

  if (chartStatusInstance) chartStatusInstance.destroy();
  const ctxStatus = document.getElementById("chart-status");
  if (ctxStatus) {
    chartStatusInstance = new Chart(ctxStatus.getContext("2d"), {
      type: 'pie',
      data: {
        labels: statusLabels,
        datasets: [{
          data: statusData,
          backgroundColor: [
            'rgba(16, 185, 129, 0.7)', // Employed
            'rgba(59, 130, 246, 0.7)', // Higher Studies
            'rgba(245, 158, 11, 0.7)', // Entrepreneur
            'rgba(139, 92, 246, 0.7)', // Preparing
            'rgba(107, 114, 128, 0.7)', // Self-employed
            'rgba(239, 68, 68, 0.7)'    // Other
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

window.exportCSV = function() {
  if (allRegistrations.length === 0) {
    showToast("No data to export.", "error");
    return;
  }

  // Get active filters from UI
  const query = document.getElementById("reg-search").value.toLowerCase().trim();
  const batch = document.getElementById("filter-batch").value;
  const branch = document.getElementById("filter-branch").value;
  const status = document.getElementById("filter-status").value;

  const dataToExport = allRegistrations.filter(r => {
    const searchMatch = !query || 
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.rollNumber && r.rollNumber.toLowerCase().includes(query)) ||
      (r.email && r.email.toLowerCase().includes(query)) ||
      (r.company && r.company.toLowerCase().includes(query)) ||
      (r.designation && r.designation.toLowerCase().includes(query));
    const batchMatch = !batch || String(r.batch) === batch;
    const branchMatch = !branch || r.branch === branch;
    let statusMatch = true;
    if (status) {
      if (status === "Pending") {
        statusMatch = r.status === "Pending" || !r.status;
      } else {
        statusMatch = r.status === status;
      }
    }
    return searchMatch && batchMatch && branchMatch && statusMatch;
  });

  if (dataToExport.length === 0) {
    showToast("No records match current filters.", "error");
    return;
  }

  const headers = ["Name", "Email", "Mobile", "Roll Number", "Branch", "Batch", "Admission Type", "Status", "App ID", "Current Status", "City", "Company", "Designation", "LinkedIn", "Willing To Contribute", "Contributions", "Spotlight Opt-In"];
  const csvRows = [headers.join(",")];

  dataToExport.forEach(r => {
    const contribs = r.contributionAreas ? r.contributionAreas.join(" | ") : "";
    const row = [
      r.name || "",
      r.email || "",
      r.mobileNumber || "",
      r.rollNumber || "",
      r.branch || "",
      r.batch || "",
      r.admissionType || "Regular",
      r.status || "Pending",
      r.appId || "N/A",
      r.currentStatus || "",
      r.city || "",
      r.company || "",
      r.designation || "",
      r.linkedin || "",
      r.willingToContribute || "",
      contribs,
      r.spotlightOptIn || "Yes"
    ].map(val => `"${val.toString().replace(/"/g, '""')}"`);
    csvRows.push(row.join(","));
  });

  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `raa_alumni_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Exported ${dataToExport.length} entries.`, "success");
};
