const composer = document.querySelector("#contact-composer");
const status = document.querySelector("#assistant-status");
const attach = document.querySelector("#attach-project");
const subject = composer.elements.subject;
const message = composer.elements.message;
const send = composer.querySelector(".composer-send");
const clear = composer.querySelector(".composer-clear");
const mailLink = document.querySelector('#contact a[href^="mailto:"]');
const formId = composer.dataset.formspreeId.trim();
const endpoint = /^[a-z0-9]+$/i.test(formId) ? `https://formspree.io/f/${formId}` : null;
const defaultSubject = "Portfolio enquiry";
let previousSuggestion = defaultSubject;
let attachment = null;
let sending = false;

function currentProject() {
  const selected = document.querySelector('.project-menu a[aria-current="true"]');
  if (!selected) return null;
  return { name: selected.textContent.trim(), url: selected.href };
}

function updateAttachment() {
  const project = currentProject();
  if (attachment && attachment.url !== project?.url) attachment = null;
  attach.hidden = !project || composer.elements.topic.value !== "project";
  attach.setAttribute("aria-pressed", String(Boolean(attachment)));
  if (project) attach.textContent = attachment ? `Remove ${project.name} link` : `Attach ${project.name} link`;
}

function guideDraft() {
  const topic = composer.elements.topic.value;
  const project = currentProject();
  const suggestion = topic === "hiring" ? "Hiring enquiry"
    : topic === "project" && project ? `Question about ${project.name}`
    : topic === "project" ? "Project question" : defaultSubject;
  if (!subject.value.trim() || subject.value === previousSuggestion) subject.value = suggestion;
  previousSuggestion = suggestion;
  if (topic !== "project") attachment = null;
  updateAttachment();
  status.textContent = topic === "hiring" ? "Ready for a hiring enquiry. Tell Joemon about the role."
    : topic === "project" && project ? `Asking about ${project.name}? I can attach the project link.`
    : "Recovery complete. Ready to talk.";
}

composer.hidden = false;
subject.value = defaultSubject;
if (endpoint) {
  send.textContent = "Send message";
  document.querySelector("#composer-help").textContent = "Your email is used so Joemon can reply.";
}

export function prepareHiringDraft() {
  if (sending) throw new Error("Wait for the current message to finish sending.");
  composer.elements.topic.value = "hiring";
  guideDraft();
  return composer.elements.email;
}
composer.addEventListener("change", event => {
  if (event.target.name === "topic") guideDraft();
});
document.addEventListener("portfolio:project-change", guideDraft);

attach.addEventListener("click", () => {
  attachment = attachment ? null : currentProject();
  updateAttachment();
  status.textContent = attachment ? `${attachment.name} link attached.` : "Project link removed.";
});
clear.addEventListener("click", () => {
  composer.reset();
  attachment = null;
  subject.value = previousSuggestion = defaultSubject;
  updateAttachment();
  status.textContent = "Draft cleared. Ready to talk.";
});

composer.addEventListener("submit", async event => {
  event.preventDefault();
  if (sending) return;
  const draft = new FormData(composer);
  const text = message.value.trim();
  if (!text || !subject.value.trim()) {
    status.textContent = "Enter a subject and message first.";
    (text ? subject : message).focus();
    return;
  }
  const body = attachment ? `${text}\n\nProject: ${attachment.name}\n${attachment.url}` : text;
  if (!endpoint) {
    const replyTo = draft.get("email");
    const emailBody = `${body}\n\nReply to: ${replyTo}`;
    status.textContent = "Opening your email app. Send the draft there when it’s ready.";
    window.location.href = `${mailLink.href}?subject=${encodeURIComponent(subject.value.trim())}&body=${encodeURIComponent(emailBody)}`;
    return;
  }
  draft.set("subject", subject.value.trim());
  draft.set("message", body);
  sending = true;
  const controls = [...composer.elements].filter(control => !control.disabled);
  for (const control of controls) control.disabled = true;
  status.textContent = "Sending your message…";
  try {
    const response = await fetch(endpoint, {
      method: "POST", body: draft, headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Submission failed");
    composer.reset();
    attachment = null;
    subject.value = previousSuggestion = defaultSubject;
    updateAttachment();
    status.textContent = "Message accepted for delivery. Thanks for reaching out.";
  } catch {
    status.textContent = "Delivery couldn’t be confirmed. Your draft is still here. You can retry or email Joemon directly.";
  } finally {
    sending = false;
    for (const control of controls) control.disabled = false;
    send.focus({ preventScroll: true });
  }
});
