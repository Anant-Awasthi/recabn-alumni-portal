// ==========================================================================
// RECABN Alumni Association (RAA) - Client Application Logic
// ==========================================================================

// Firebase Configuration
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
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  console.log("Firebase Database Initialized successfully");
} catch (error) {
  console.error("Firebase Database initialization failed:", error);
}

// DOM Elements
const navbar = document.getElementById("navbar");
const mobileToggle = document.getElementById("mobile-toggle");
const navLinks = document.getElementById("nav-links");
const registrationForm = document.getElementById("registration-form");
const contactForm = document.getElementById("contact-form");
const toastContainer = document.getElementById("toast-container");

// Mobile Menu Toggle
if (mobileToggle && navLinks) {
  const toggleMenu = (open) => {
    navLinks.classList.toggle("active", open);
    mobileToggle.setAttribute("aria-expanded", open ? "true" : "false");
    const icon = mobileToggle.querySelector("i");
    if (open) {
      icon.className = "fa-solid fa-xmark";
      document.body.classList.add("no-scroll");
    } else {
      icon.className = "fa-solid fa-bars";
      document.body.classList.remove("no-scroll");
    }
  };

  mobileToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = navLinks.classList.contains("active");
    toggleMenu(!isOpen);
  });

  // Close Mobile Menu when clicking a link
  document.querySelectorAll("#nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      toggleMenu(false);
    });
  });

  // Close Mobile Menu when clicking outside of it
  document.addEventListener("click", (e) => {
    if (navLinks.classList.contains("active") && !navLinks.contains(e.target) && !mobileToggle.contains(e.target)) {
      toggleMenu(false);
    }
  });
}

// Window Scroll effect for Active Link and Navbar
window.addEventListener("scroll", () => {
  let current = "";
  const sections = document.querySelectorAll("section");
  const scrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

  // Toggle navbar scrolled style
  if (scrollPosition > 50) {
    navbar.classList.add("navbar-scrolled");
  } else {
    navbar.classList.remove("navbar-scrolled");
  }

  if (window.innerHeight + scrollPosition >= document.documentElement.scrollHeight - 20) {
    current = "contact";
  } else {
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionId = section.getAttribute("id");
      if (sectionId && scrollPosition >= (sectionTop - 120)) {
        current = sectionId;
      }
    });
  }

  // Map sections that do not have nav links to their preceding/logical counterparts
  if (current === "register-section") {
    current = "documents";
  }

  document.querySelectorAll("#nav-links a").forEach(a => {
    a.classList.remove("active");
    const href = a.getAttribute("href") || "";
    if (href === `#${current}`) {
      a.classList.add("active");
    }
  });
});

// Toast Notifications Helper
function showToast(message, type = "success") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);

  // Remove toast after 4 seconds
  setTimeout(() => {
    toast.style.animation = "toastIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Validation Helper Functions
function validateEmail(email) {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).toLowerCase());
}

function validateName(name) {
  const re = /^[a-zA-Z\s.-]+$/;
  return name.trim().length >= 2 && re.test(name);
}

function validateLinkedin(url) {
  if (!url) return true;
  const re = /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
  return re.test(url);
}

function displayFieldError(inputEl, feedbackEl, isValid, message) {
  if (isValid) {
    inputEl.classList.remove("is-invalid");
    inputEl.classList.add("is-valid");
    if (feedbackEl) {
      feedbackEl.style.display = "none";
      feedbackEl.innerHTML = "";
    }
  } else {
    inputEl.classList.remove("is-valid");
    inputEl.classList.add("is-invalid");
    if (feedbackEl) {
      feedbackEl.style.display = "flex";
      feedbackEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${message}</span>`;
    }
  }
}

// Handle Form Submission: RAA Registration / Connect Request
if (registrationForm) {
  const inputs = {
    name: { el: document.getElementById("reg-name"), feedback: document.getElementById("feedback-reg-name") },
    email: { el: document.getElementById("reg-email"), feedback: document.getElementById("feedback-reg-email") },
    batch: { el: document.getElementById("reg-batch"), feedback: document.getElementById("feedback-reg-batch") },
    branch: { el: document.getElementById("reg-branch"), feedback: document.getElementById("feedback-reg-branch") },
    city: { el: document.getElementById("reg-city"), feedback: document.getElementById("feedback-reg-city") },
    linkedin: { el: document.getElementById("reg-linkedin"), feedback: document.getElementById("feedback-reg-linkedin") },
    disclaimer: { el: document.getElementById("reg-disclaimer"), feedback: document.getElementById("feedback-reg-disclaimer") }
  };

  const validateForm = () => {
    let isValid = true;
    
    // Name validation
    const nameVal = inputs.name.el.value;
    const isNameOk = validateName(nameVal);
    displayFieldError(inputs.name.el, inputs.name.feedback, isNameOk, "Full Name must contain at least 2 characters (letters, spaces, dots or hyphens only).");
    if (!isNameOk) isValid = false;

    // Email validation
    const emailVal = inputs.email.el.value;
    const isEmailOk = validateEmail(emailVal);
    displayFieldError(inputs.email.el, inputs.email.feedback, isEmailOk, "Please enter a valid email address.");
    if (!isEmailOk) isValid = false;

    // Batch validation
    const batchVal = inputs.batch.el.value;
    const isBatchOk = batchVal !== "";
    displayFieldError(inputs.batch.el, inputs.batch.feedback, isBatchOk, "Please select your graduation year.");
    if (!isBatchOk) isValid = false;

    // Branch validation
    const branchVal = inputs.branch.el.value;
    const isBranchOk = ["Information Technology", "Electrical Engineering", "Civil Engineering"].includes(branchVal);
    displayFieldError(inputs.branch.el, inputs.branch.feedback, isBranchOk, "Please select a verified engineering branch.");
    if (!isBranchOk) isValid = false;

    // City validation
    const cityVal = inputs.city.el.value.trim();
    const isCityOk = cityVal.length >= 2;
    displayFieldError(inputs.city.el, inputs.city.feedback, isCityOk, "Current City must be at least 2 characters.");
    if (!isCityOk) isValid = false;

    // LinkedIn validation
    const linkedinVal = inputs.linkedin.el.value;
    const isLinkedinOk = validateLinkedin(linkedinVal);
    displayFieldError(inputs.linkedin.el, inputs.linkedin.feedback, isLinkedinOk, "Please enter a valid LinkedIn Profile URL (e.g. https://linkedin.com/in/username).");
    if (!isLinkedinOk) isValid = false;

    // Disclaimer validation
    const disclaimerOk = inputs.disclaimer.el.checked;
    displayFieldError(inputs.disclaimer.el, inputs.disclaimer.feedback, disclaimerOk, "You must acknowledge the verification disclaimer to proceed.");
    if (!disclaimerOk) isValid = false;

    return isValid;
  };

  // Attach real-time validation on change or blur
  Object.keys(inputs).forEach(key => {
    const field = inputs[key];
    const eventName = field.el.tagName === "SELECT" || field.el.type === "checkbox" ? "change" : "blur";
    field.el.addEventListener(eventName, () => {
      if (key === "name") {
        displayFieldError(field.el, field.feedback, validateName(field.el.value), "Full Name must contain at least 2 characters (letters, spaces, dots or hyphens only).");
      } else if (key === "email") {
        displayFieldError(field.el, field.feedback, validateEmail(field.el.value), "Please enter a valid email address.");
      } else if (key === "batch") {
        displayFieldError(field.el, field.feedback, field.el.value !== "", "Please select your graduation year.");
      } else if (key === "branch") {
        displayFieldError(field.el, field.feedback, ["Information Technology", "Electrical Engineering", "Civil Engineering"].includes(field.el.value), "Please select a verified engineering branch.");
      } else if (key === "city") {
        displayFieldError(field.el, field.feedback, field.el.value.trim().length >= 2, "Current City must be at least 2 characters.");
      } else if (key === "linkedin") {
        displayFieldError(field.el, field.feedback, validateLinkedin(field.el.value), "Please enter a valid LinkedIn Profile URL (e.g. https://linkedin.com/in/username).");
      } else if (key === "disclaimer") {
        displayFieldError(field.el, field.feedback, field.el.checked, "You must acknowledge the verification disclaimer to proceed.");
      }
    });
  });

  registrationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const banner = document.getElementById("form-message-banner");
    banner.style.display = "none";
    banner.className = "form-message-banner";
    banner.innerHTML = "";

    const isValid = validateForm();
    if (!isValid) {
      banner.className = "form-message-banner error";
      banner.innerHTML = "<strong>Submission Blocked:</strong> Please correct the highlighted validation errors below.";
      banner.style.display = "block";
      document.getElementById("register-section").scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    const submitBtn = document.getElementById("reg-submit-btn");
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    const newAlumni = {
      name: inputs.name.el.value,
      email: inputs.email.el.value,
      batch: inputs.batch.el.value,
      branch: inputs.branch.el.value,
      company: document.getElementById("reg-company").value || "",
      designation: document.getElementById("reg-designation").value || "",
      city: inputs.city.el.value,
      linkedin: inputs.linkedin.el.value || "",
    };

    try {
      if (!db) {
        throw new Error("Database connection unavailable. Please try again later.");
      }
      // Write to Firebase Firestore
      await db.collection("alumni_registrations").add({
        ...newAlumni,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log("Written to Cloud Firestore Successfully");

      // Success response banner
      banner.className = "form-message-banner success";
      banner.innerHTML = "<strong>Thank you!</strong> Your expression of interest has been received and will be reviewed as part of the consultation process.";
      banner.style.display = "block";
      showToast("Success", "Your expression of interest has been received.", "success");

      // Reset Form and remove classes
      registrationForm.reset();
      Object.keys(inputs).forEach(key => {
        inputs[key].el.classList.remove("is-valid", "is-invalid");
      });
      document.getElementById("register-section").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      console.error("Error saving registration:", error);
      banner.className = "form-message-banner error";
      banner.innerHTML = "<strong>System Error:</strong> An error occurred while saving your request. Please try again later.";
      banner.style.display = "block";
      showToast("Error", "An error occurred. Please try again.", "error");
      document.getElementById("register-section").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  });
}

// Handle Form Submission: Contact/Query Form
if (contactForm) {
  const contactInputs = {
    name: { el: document.getElementById("contact-name"), feedback: document.getElementById("feedback-contact-name") },
    email: { el: document.getElementById("contact-email"), feedback: document.getElementById("feedback-contact-email") },
    message: { el: document.getElementById("contact-message"), feedback: document.getElementById("feedback-contact-message") }
  };

  const validateContactForm = () => {
    let isValid = true;

    // Name
    const nameVal = contactInputs.name.el.value;
    const isNameOk = validateName(nameVal);
    displayFieldError(contactInputs.name.el, contactInputs.name.feedback, isNameOk, "Name must be at least 2 characters (letters/spaces/dots/hyphens only).");
    if (!isNameOk) isValid = false;

    // Email
    const emailVal = contactInputs.email.el.value;
    const isEmailOk = validateEmail(emailVal);
    displayFieldError(contactInputs.email.el, contactInputs.email.feedback, isEmailOk, "Please enter a valid email address.");
    if (!isEmailOk) isValid = false;

    // Message
    const msgVal = contactInputs.message.el.value.trim();
    const isMsgOk = msgVal.length >= 10;
    displayFieldError(contactInputs.message.el, contactInputs.message.feedback, isMsgOk, "Message details must be at least 10 characters.");
    if (!isMsgOk) isValid = false;

    return isValid;
  };

  // Real-time blur validation
  Object.keys(contactInputs).forEach(key => {
    const field = contactInputs[key];
    field.el.addEventListener("blur", () => {
      if (key === "name") {
        displayFieldError(field.el, field.feedback, validateName(field.el.value), "Name must be at least 2 characters (letters/spaces/dots/hyphens only).");
      } else if (key === "email") {
        displayFieldError(field.el, field.feedback, validateEmail(field.el.value), "Please enter a valid email address.");
      } else if (key === "message") {
        displayFieldError(field.el, field.feedback, field.el.value.trim().length >= 10, "Message details must be at least 10 characters.");
      }
    });
  });

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const banner = document.getElementById("contact-message-banner");
    banner.style.display = "none";
    banner.className = "form-message-banner";
    banner.innerHTML = "";

    const isValid = validateContactForm();
    if (!isValid) {
      banner.className = "form-message-banner error";
      banner.innerHTML = "<strong>Submission Blocked:</strong> Please fix the highlighted errors below.";
      banner.style.display = "block";
      document.getElementById("contact").scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    const submitBtn = document.getElementById("contact-submit-btn");
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    const messageData = {
      name: contactInputs.name.el.value,
      email: contactInputs.email.el.value,
      message: contactInputs.message.el.value
    };

    try {
      if (db) {
        // Write to Firebase Firestore
        await db.collection("contact_messages").add({
          ...messageData,
          submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Message saved to Cloud Firestore");
      }

      banner.className = "form-message-banner success";
      banner.innerHTML = `
        <div style="display: flex; gap: 12px; align-items: flex-start;">
          <i class="fa-solid fa-circle-check" style="color: var(--success); font-size: 1.25rem; margin-top: 2px;"></i>
          <div>
            <strong>Message Received</strong>
            <p style="margin: 4px 0 0; font-size: 0.9rem;">
              Messages submitted through this form are reviewed by the coordination team.
            </p>
          </div>
        </div>
      `;
      banner.style.display = "block";
      showToast("Your message has been submitted successfully.");

      contactForm.reset();
      Object.keys(contactInputs).forEach(key => {
        contactInputs[key].el.classList.remove("is-valid", "is-invalid");
      });
      document.getElementById("contact").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      console.error("Error saving message:", error);
      banner.className = "form-message-banner error";
      banner.innerHTML = "<strong>System Error:</strong> Could not submit your message. Please try again later.";
      banner.style.display = "block";
      showToast("Could not send message. Please try again.", "error");
      document.getElementById("contact").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  });
}

// ==========================================================================
// Status Tracker Logic
// ==========================================================================
const statusTrackerForm = document.getElementById("status-tracker-form");
if (statusTrackerForm) {
  const statusInputs = {
    appId: { el: document.getElementById("status-app-id"), feedback: document.getElementById("feedback-status-app-id") },
    email: { el: document.getElementById("status-email"), feedback: document.getElementById("feedback-status-email") }
  };

  const validateStatusId = (id) => {
    // Matches RAA-XX-XXXX e.g. RAA-24-1029, RAA-26-4032 (case insensitive)
    const re = /^RAA-\d{2}-\d{4,6}$/i;
    return re.test(id.trim());
  };

  statusTrackerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const banner = document.getElementById("status-result-banner");
    banner.style.display = "none";
    banner.className = "form-message-banner";
    banner.innerHTML = "";

    const appIdVal = statusInputs.appId.el.value.trim();
    const emailVal = statusInputs.email.el.value.trim();

    let isValid = true;

    // Validate Application ID
    const isAppIdOk = validateStatusId(appIdVal);
    displayFieldError(statusInputs.appId.el, statusInputs.appId.feedback, isAppIdOk, "Application ID must be in format RAA-YY-NNNN (e.g. RAA-26-1049).");
    if (!isAppIdOk) isValid = false;

    // Validate Email
    const isEmailOk = validateEmail(emailVal);
    displayFieldError(statusInputs.email.el, statusInputs.email.feedback, isEmailOk, "Please enter a valid email address.");
    if (!isEmailOk) isValid = false;

    if (!isValid) return;

    const submitBtn = statusTrackerForm.querySelector("button[type='submit']");
    const spinner = document.getElementById("status-btn-spinner");
    const btnText = document.getElementById("status-btn-text");

    if (spinner) spinner.style.display = "inline-block";
    if (btnText) btnText.style.display = "none";
    submitBtn.disabled = true;

    // Show honest registry-not-launched response after brief delay
    setTimeout(() => {
      if (spinner) spinner.style.display = "none";
      if (btnText) btnText.style.display = "inline";
      submitBtn.disabled = false;

      banner.className = "form-message-banner";
      banner.style.cssText += "; background: #f0f4f8; border: 1px solid #c9d8e8; color: var(--primary);";
      banner.innerHTML = `
        <div style="display: flex; gap: var(--space-sm); align-items: flex-start;">
          <i class="fa-solid fa-circle-info" style="font-size: 1.4rem; color: var(--accent); margin-top: 2px; flex-shrink: 0;"></i>
          <div>
            <h4 style="color: var(--primary); font-size: 0.95rem; font-weight: 700; margin-bottom: 6px; font-family: var(--font-body);">Registry Status System — Not Yet Active</h4>
            <p style="color: var(--text-sub); font-size: 0.8rem; margin-bottom: 10px; line-height: 1.5;">
              The formal alumni registry has not yet been launched. Application IDs and live status tracking will be enabled after the RAA charter receives official institutional approval from the college administration.
            </p>
            <div style="font-size: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 8px; color: var(--text-muted);">
              If you have already submitted an expression of interest via the registry form above, your details are saved and will be reviewed during the formal onboarding process after launch.
            </div>
          </div>
        </div>
      `;
      banner.style.display = "block";
    }, 600);
  });
}

// Scroll-Reveal Animation
function initScrollReveal() {
  const revealElements = document.querySelectorAll(".scroll-reveal");
  
  const options = {
    threshold: 0.1,
    rootMargin: "0px 0px -40px 0px"
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, options);

  revealElements.forEach(el => observer.observe(el));
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
});
