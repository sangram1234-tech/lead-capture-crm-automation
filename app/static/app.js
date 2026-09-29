/**
 * Northstar AI CRM - Client Application Logic
 * Modern SaaS UI & AI Lead Scoring Engine
 */

// ============================================================================
// AI Scoring & Temperature Heuristic Engine
// ============================================================================
const HIGH_INTENT_TERMS = [
  'urgent', 'demo', 'pricing', 'quote', 'buy', 'immediately', 'enterprise',
  'budget', 'contract', 'scale', 'pilot', 'purchase', 'hire', 'asap', 'partnership'
];

const MEDIUM_INTENT_TERMS = [
  'feature', 'integrate', 'api', 'team', 'help', 'platform', 'explore',
  'solution', 'services', 'evaluating', 'recommend'
];

function analyzeLeadAI(lead) {
  let score = 50; // default baseline
  const status = (lead.status || 'New').toLowerCase();
  const text = ((lead.message || '') + ' ' + (lead.company || '')).toLowerCase();
  const matchedHigh = [];
  const matchedMed = [];

  // 1. Status Weighting
  if (status === 'converted') score = 96;
  else if (status === 'qualified') score = 86;
  else if (status === 'contacted') score = 64;
  else if (status === 'lost') score = 22;
  else score = 52; // New

  // 2. Intent Keyword Detection in Message
  HIGH_INTENT_TERMS.forEach(term => {
    if (text.includes(term)) matchedHigh.push(term);
  });
  MEDIUM_INTENT_TERMS.forEach(term => {
    if (text.includes(term)) matchedMed.push(term);
  });

  if (status !== 'converted' && status !== 'lost') {
    score += Math.min(matchedHigh.length * 12, 30);
    score += Math.min(matchedMed.length * 5, 15);

    // Message depth
    if ((lead.message || '').length > 100) score += 6;

    // Corporate email bonus
    const email = (lead.email || '').toLowerCase();
    if (!email.endsWith('@gmail.com') && !email.endsWith('@yahoo.com') && !email.endsWith('@hotmail.com')) {
      score += 6;
    }
  }

  score = Math.max(12, Math.min(score, 99));

  let temperature = 'Cold';
  let reasoning = 'Baseline engagement with standard inquiry profile.';

  if (score >= 80) {
    temperature = 'Hot';
    if (status === 'converted') {
      reasoning = 'High value: Account successfully converted and onboarded.';
    } else if (matchedHigh.length > 0) {
      reasoning = `High commercial intent detected: mentioned key signals "${matchedHigh.slice(0, 2).join('", "')}".`;
    } else {
      reasoning = 'Strong qualification score based on organizational profile and depth.';
    }
  } else if (score >= 50) {
    temperature = 'Warm';
    if (matchedMed.length > 0) {
      reasoning = `Moderate product evaluation detected: referenced "${matchedMed.slice(0, 2).join('", "')}".`;
    } else {
      reasoning = 'Active exploration stage; standard contact timeline recommended.';
    }
  } else {
    temperature = 'Cold';
    reasoning = status === 'lost' ? 'Account marked as lost or unviable.' : 'Low engagement signals detected; nurture campaign suggested.';
  }

  return { score, temperature, reasoning };
}

// ============================================================================
// Helper Utilities
// ============================================================================
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function getInitials(name) {
  if (!name) return 'LD';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function fmtDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return isoString;
  }
}

function fmtDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (e) {
    return isoString;
  }
}

function showToast(message, type = 'success') {
  const container = document.querySelector('#toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="font-weight: 700;">${type === 'success' ? '✓' : '⚠'}</span>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ============================================================================
// Modal & Drawer Management
// ============================================================================
function openModal(id) {
  const modal = document.querySelector(`#${id}`);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.querySelector(`#${id}`);
  if (modal) modal.classList.remove('active');
}

function openDrawer() {
  const backdrop = document.querySelector('#lead-drawer-backdrop');
  if (backdrop) backdrop.classList.add('active');
}

function closeDrawer() {
  const backdrop = document.querySelector('#lead-drawer-backdrop');
  if (backdrop) backdrop.classList.remove('active');
}

// Global modal close handlers
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
    closeDrawer();
  }
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    const search = document.querySelector('#search');
    if (search) {
      e.preventDefault();
      search.focus();
    }
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
  }
  if (e.target.id === 'lead-drawer-backdrop') {
    closeDrawer();
  }
});

// Mobile Sidebar Toggle
const mobileBtn = document.querySelector('#mobile-toggle');
const sidebar = document.querySelector('#sidebar');
if (mobileBtn && sidebar) {
  mobileBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
}

// Modal Trigger Buttons
const btnOpenAddLead = document.querySelector('#btn-open-add-lead');
const sidebarAddLead = document.querySelector('#sidebar-add-lead-btn');
if (btnOpenAddLead) btnOpenAddLead.addEventListener('click', () => openModal('add-lead-modal'));
if (sidebarAddLead) sidebarAddLead.addEventListener('click', () => openModal('add-lead-modal'));

const btnCloseAddModal = document.querySelector('#btn-close-add-modal');
const btnCancelAddModal = document.querySelector('#btn-cancel-add-modal');
if (btnCloseAddModal) btnCloseAddModal.addEventListener('click', () => closeModal('add-lead-modal'));
if (btnCancelAddModal) btnCancelAddModal.addEventListener('click', () => closeModal('add-lead-modal'));

const btnOpenImport = document.querySelector('#btn-open-import');
const sidebarImport = document.querySelector('#sidebar-import-btn');
if (btnOpenImport) btnOpenImport.addEventListener('click', () => openModal('import-csv-modal'));
if (sidebarImport) sidebarImport.addEventListener('click', () => openModal('import-csv-modal'));

const btnCloseImportModal = document.querySelector('#btn-close-import-modal');
const btnCancelImportModal = document.querySelector('#btn-cancel-import-modal');
if (btnCloseImportModal) btnCloseImportModal.addEventListener('click', () => closeModal('import-csv-modal'));
if (btnCancelImportModal) btnCancelImportModal.addEventListener('click', () => closeModal('import-csv-modal'));

const btnCloseDrawer = document.querySelector('#btn-close-drawer');
const btnDoneDrawer = document.querySelector('#btn-done-drawer');
if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
if (btnDoneDrawer) btnDoneDrawer.addEventListener('click', closeDrawer);

// ============================================================================
// File Dropzone Interaction
// ============================================================================
document.querySelectorAll('.dropzone').forEach(dropzone => {
  const fileInput = dropzone.querySelector('input[type="file"]');
  const label = dropzone.querySelector('#dropzone-label') || dropzone.querySelector('div:nth-child(2)');

  dropzone.addEventListener('click', () => fileInput && fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      if (label) label.textContent = `Selected: ${fileInput.files[0].name}`;
    }
  });

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0 && label) {
        label.textContent = `Selected: ${fileInput.files[0].name}`;
      }
    });
  }
});

// ============================================================================
// Lead Submission Form Handling (Works on / and /dashboard)
// ============================================================================
const leadForm = document.querySelector('#lead-form');
if (leadForm) {
  leadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const messageEl = document.querySelector('#form-message');
    const submitBtn = leadForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Saving…</span>`;
    if (messageEl) {
      messageEl.style.display = 'none';
      messageEl.className = 'alert';
    }

    try {
      const data = Object.fromEntries(new FormData(leadForm));
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.detail || 'Unable to submit your enquiry.');
      }

      showToast(`Lead for "${body.name}" successfully created!`, 'success');

      if (messageEl) {
        messageEl.textContent = `Thank you, ${body.name}. Your lead was recorded and automated emails were queued.`;
        messageEl.className = 'alert success';
        messageEl.style.display = 'flex';
      }

      leadForm.reset();

      // If in modal, close after 1s
      if (document.querySelector('#add-lead-modal')) {
        setTimeout(() => {
          closeModal('add-lead-modal');
          if (messageEl) messageEl.style.display = 'none';
        }, 1200);
      }

      // Refresh dashboard if present
      if (typeof window.refreshDashboard === 'function') {
        window.refreshDashboard();
      }
    } catch (e) {
      if (messageEl) {
        messageEl.textContent = e.message;
        messageEl.className = 'alert error';
        messageEl.style.display = 'flex';
      }
      showToast(e.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// ============================================================================
// CSV Import Form Handling
// ============================================================================
const csvForm = document.querySelector('#csv-form');
if (csvForm) {
  csvForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const messageEl = document.querySelector('#csv-message');
    const submitBtn = csvForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Importing CSV…</span>`;
    if (messageEl) {
      messageEl.style.display = 'none';
      messageEl.className = 'alert';
    }

    try {
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        body: new FormData(csvForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'CSV Import failed.');
      }

      const summary = `
        <strong>${data.successfully_imported} leads imported</strong> out of ${data.total_rows} rows.<br>
        <span style="font-size: 12px;">Duplicates skipped: ${data.duplicates} | Invalid: ${data.invalid_rows} | Failed: ${data.failed_rows}</span>
        ${data.row_errors && data.row_errors.length ? '<div style="margin-top:8px; max-height:100px; overflow-y:auto; font-size:11.5px; border-top:1px solid rgba(0,0,0,0.1); padding-top:6px;">' + data.row_errors.map(x => `Row ${x.row}: ${escapeHtml(x.error)}`).join('<br>') + '</div>' : ''}
      `;

      if (messageEl) {
        messageEl.innerHTML = summary;
        messageEl.className = 'alert success';
        messageEl.style.display = 'block';
      }

      showToast(`Import completed: ${data.successfully_imported} added`, 'success');
      csvForm.reset();

      const label = csvForm.querySelector('#dropzone-label');
      if (label) label.textContent = 'Click to browse or drop CSV file here';

      if (typeof window.refreshDashboard === 'function') {
        window.refreshDashboard();
      }
    } catch (e) {
      if (messageEl) {
        messageEl.textContent = e.message;
        messageEl.className = 'alert error';
        messageEl.style.display = 'block';
      }
      showToast(e.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// ============================================================================
// Dashboard Core Controller
// ============================================================================
const dashboardContainer = document.querySelector('#summary-cards');

if (dashboardContainer) {
  let allLeads = [];
  let currentLead = null;

  async function refreshDashboard() {
    const refreshBtn = document.querySelector('#btn-refresh');
    if (refreshBtn) refreshBtn.classList.add('spinning');

    const searchVal = document.querySelector('#search') ? document.querySelector('#search').value.trim() : '';
    const statusVal = document.querySelector('#status-filter') ? document.querySelector('#status-filter').value : '';
    const tempVal = document.querySelector('#temp-filter') ? document.querySelector('#temp-filter').value : '';
    const sourceVal = document.querySelector('#source-filter') ? document.querySelector('#source-filter').value : '';

    try {
      // 1. Fetch data from existing endpoints in parallel
      const [statsRes, leadsRes, logsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch(`/api/leads?q=${encodeURIComponent(searchVal)}${statusVal ? `&status=${encodeURIComponent(statusVal)}` : ''}`),
        fetch('/api/logs?limit=12')
      ]);

      const stats = await statsRes.json();
      const rawLeads = await leadsRes.json();
      const logs = await logsRes.json();

      // Enrich leads with deterministic AI intelligence
      allLeads = rawLeads.map(l => {
        const ai = analyzeLeadAI(l);
        return { ...l, ai };
      });

      // Filter client-side for additional filters (Temperature, Source, and Follow-up alias)
      let filteredLeads = allLeads;
      if (tempVal) {
        filteredLeads = filteredLeads.filter(l => l.ai.temperature.toLowerCase() === tempVal.toLowerCase());
      }
      if (sourceVal) {
        filteredLeads = filteredLeads.filter(l => (l.source || '').toLowerCase() === sourceVal.toLowerCase());
      }

      // 2. Render 4 Primary Summary Cards
      const totalCount = stats.total_leads || allLeads.length;
      const newCount = stats.new_leads || 0;
      const convertedCount = stats.converted_leads || 0;
      const hotCount = allLeads.filter(l => l.ai.temperature === 'Hot').length;

      const elTotal = document.querySelector('#val-total-leads');
      const elNew = document.querySelector('#val-new-leads');
      const elHot = document.querySelector('#val-hot-leads');
      const elConverted = document.querySelector('#val-converted-leads');

      if (elTotal) elTotal.textContent = totalCount;
      if (elNew) elNew.textContent = newCount;
      if (elHot) elHot.textContent = hotCount;
      if (elConverted) elConverted.textContent = convertedCount;

      const convRateEl = document.querySelector('#val-conversion-rate');
      if (convRateEl) {
        const rate = totalCount > 0 ? Math.round((convertedCount / totalCount) * 100) : 0;
        convRateEl.textContent = `${rate}% conversion`;
      }

      const navCounter = document.querySelector('#nav-lead-count');
      if (navCounter) navCounter.textContent = totalCount;

      // 3. Render Secondary Metrics Bar
      const setVal = (id, val) => {
        const el = document.querySelector(`#${id}`);
        if (el) el.textContent = val ?? 0;
      };
      setVal('val-contacted-leads', stats.contacted_leads);
      setVal('val-qualified-leads', stats.qualified_leads);
      setVal('val-lost-leads', stats.lost_leads);
      setVal('val-website-leads', stats.website_leads);
      setVal('val-csv-leads', stats.csv_leads);
      setVal('val-duplicates-count', stats.duplicate_count);

      // 4. Render Leads Table
      const tbody = document.querySelector('#leads-body');
      const emptyState = document.querySelector('#empty-state');

      if (tbody) {
        if (filteredLeads.length === 0) {
          tbody.innerHTML = '';
          if (emptyState) emptyState.style.display = 'flex';
        } else {
          if (emptyState) emptyState.style.display = 'none';
          tbody.innerHTML = filteredLeads.map(lead => {
            const tempClass = lead.ai.temperature.toLowerCase();
            const statusClass = lead.status.toLowerCase().replace(/\s+/g, '-');
            const initials = getInitials(lead.name);
            const tempIcon = tempClass === 'hot' ? '🔥' : tempClass === 'warm' ? '⚡' : '❄️';

            return `
              <tr data-lead-id="${lead.id}">
                <td>
                  <div class="lead-cell">
                    <div class="avatar-circle">${escapeHtml(initials)}</div>
                    <div class="lead-name-group">
                      <span class="lead-name">${escapeHtml(lead.name)}</span>
                      <span class="lead-company">${escapeHtml(lead.company || '—')}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span style="font-family: var(--font-mono); font-size: 12.5px;">${escapeHtml(lead.email)}</span>
                </td>
                <td>
                  <span class="badge-source ${(lead.source || '').toLowerCase()}">${escapeHtml(lead.source || 'Website')}</span>
                </td>
                <td>
                  <span class="badge-status ${statusClass}">
                    <span class="status-dot"></span>
                    ${escapeHtml(lead.status)}
                  </span>
                </td>
                <td>
                  <span class="badge-temp ${tempClass}" title="AI Score: ${lead.ai.score}/100">
                    <span>${tempIcon}</span>
                    <span>${lead.ai.temperature} (${lead.ai.score}%)</span>
                  </span>
                </td>
                <td>
                  <span style="font-size: 12px; color: var(--text-muted);">${fmtDate(lead.created_at)}</span>
                </td>
                <td style="text-align: right;">
                  <div class="row-actions" style="justify-content: flex-end;">
                    <button class="btn-row-action view" title="View Lead Details" onclick="window.viewLeadDetails(${lead.id}); event.stopPropagation();">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                    <button class="btn-row-action delete" title="Delete Lead" onclick="window.deleteLeadItem(${lead.id}, '${escapeHtml(lead.name)}'); event.stopPropagation();">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('');

          // Click row to view details
          tbody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', () => {
              const id = row.getAttribute('data-lead-id');
              if (id) window.viewLeadDetails(Number(id));
            });
          });
        }
      }

      // 5. Render Activity Logs
      const logsContainer = document.querySelector('#logs');
      if (logsContainer) {
        if (!logs || logs.length === 0) {
          logsContainer.innerHTML = '<p style="color: var(--text-muted); padding: 12px;">No activity logs recorded yet.</p>';
        } else {
          logsContainer.innerHTML = logs.map(x => {
            const statusKey = (x.status || 'success').toLowerCase();
            const iconSvg = statusKey === 'success'
              ? '<polyline points="20 6 9 17 4 12"></polyline>'
              : statusKey === 'skipped'
              ? '<circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>'
              : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';

            return `
              <div class="log-item">
                <div class="log-indicator ${statusKey}">
                  <svg viewBox="0 0 24 24">${iconSvg}</svg>
                </div>
                <div class="log-body">
                  <div class="log-title-row">
                    <span class="log-action">${escapeHtml((x.action || '').replaceAll('_', ' '))}</span>
                    <span class="log-time">${fmtDateTime(x.created_at)}</span>
                  </div>
                  <div class="log-msg">${escapeHtml(x.message)}</div>
                </div>
              </div>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.error('Error refreshing pipeline:', err);
      showToast('Error syncing pipeline data', 'error');
    } finally {
      if (refreshBtn) {
        setTimeout(() => refreshBtn.classList.remove('spinning'), 400);
      }
    }
  }

  // Expose refresh globally
  window.refreshDashboard = refreshDashboard;

  // View Lead Details in Slide-over Drawer
  window.viewLeadDetails = function(leadId) {
    const lead = allLeads.find(l => l.id === leadId);
    if (!lead) return;
    currentLead = lead;

    const drawerBody = document.querySelector('#drawer-content');
    if (!drawerBody) return;

    const tempClass = lead.ai.temperature.toLowerCase();
    const statusClass = lead.status.toLowerCase().replace(/\s+/g, '-');
    const initials = getInitials(lead.name);
    const tempIcon = tempClass === 'hot' ? '🔥' : tempClass === 'warm' ? '⚡' : '❄️';

    drawerBody.innerHTML = `
      <!-- Lead Header Card -->
      <div style="display: flex; align-items: center; gap: 16px;">
        <div class="avatar-circle" style="width: 52px; height: 52px; font-size: 18px;">${escapeHtml(initials)}</div>
        <div style="display: flex; flex-direction: column;">
          <h2 style="font-family: var(--font-sans); font-size: 20px; font-weight: 700; color: var(--text-primary);">${escapeHtml(lead.name)}</h2>
          <span style="color: var(--text-muted); font-size: 13.5px;">${escapeHtml(lead.company || 'Individual')}</span>
        </div>
      </div>

      <!-- AI Lead Intelligence Card -->
      <div class="ai-insight-box">
        <div class="ai-insight-header">
          <div class="ai-insight-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span>AI Predictive Rating</span>
          </div>
          <div class="badge-temp ${tempClass}">
            ${tempIcon} ${lead.ai.temperature}
          </div>
        </div>

        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 12px; font-weight: 600; color: #4338ca;">Engagement Score</span>
            <span class="ai-score-number">${lead.ai.score}/100</span>
          </div>
          <div class="ai-score-bar-bg">
            <div class="ai-score-bar-fill" style="width: ${lead.ai.score}%;"></div>
          </div>
        </div>

        <div class="ai-explanation">
          <strong>AI Analysis:</strong> ${escapeHtml(lead.ai.reasoning)}
        </div>
      </div>

      <!-- Details Grid -->
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Email Address</span>
          <a href="mailto:${escapeHtml(lead.email)}" class="detail-val" style="color: var(--primary); text-decoration: underline;">
            ${escapeHtml(lead.email)}
          </a>
        </div>

        <div class="detail-item">
          <span class="detail-label">Intake Source</span>
          <span class="detail-val">
            <span class="badge-source ${(lead.source || '').toLowerCase()}">${escapeHtml(lead.source)}</span>
          </span>
        </div>

        <div class="detail-item">
          <span class="detail-label">Pipeline Status</span>
          <select id="drawer-status-select" class="form-select" style="padding: 6px 10px; font-size: 12.5px; margin-top: 4px;">
            <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Qualified" ${lead.status === 'Qualified' ? 'selected' : ''}>Qualified</option>
            <option value="Converted" ${lead.status === 'Converted' ? 'selected' : ''}>Converted</option>
            <option value="Lost" ${lead.status === 'Lost' ? 'selected' : ''}>Lost</option>
          </select>
        </div>

        <div class="detail-item">
          <span class="detail-label">Captured Date</span>
          <span class="detail-val">${fmtDateTime(lead.created_at)}</span>
        </div>
      </div>

      <!-- Message / Inquiry Block -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <span class="detail-label">Project Inquiry / Goals</span>
        <div class="enquiry-quote">${escapeHtml(lead.message)}</div>
      </div>
    `;

    // Hook up Status update via existing PATCH /api/leads/{id}
    const statusSelect = document.querySelector('#drawer-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', async () => {
        const newStatus = statusSelect.value;
        try {
          const res = await fetch(`/api/leads/${lead.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Could not update status.');
          }
          showToast(`Status updated to "${newStatus}"`, 'success');
          lead.status = newStatus;
          refreshDashboard();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    openDrawer();
  };

  // Delete Lead via existing DELETE /api/leads/{id}
  window.deleteLeadItem = async function(id, name) {
    if (!confirm(`Are you sure you want to delete lead "${name}"?`)) return;

    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to delete lead.');
      }
      showToast(`Lead "${name}" deleted.`, 'success');
      closeDrawer();
      refreshDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Drawer Footer Delete Button
  const btnDeleteLead = document.querySelector('#btn-delete-lead');
  if (btnDeleteLead) {
    btnDeleteLead.addEventListener('click', () => {
      if (currentLead) {
        window.deleteLeadItem(currentLead.id, currentLead.name);
      }
    });
  }

  // Event Listeners for Filters
  const searchInput = document.querySelector('#search');
  const statusFilter = document.querySelector('#status-filter');
  const tempFilter = document.querySelector('#temp-filter');
  const sourceFilter = document.querySelector('#source-filter');
  const btnReset = document.querySelector('#btn-reset-filters');
  const btnRefresh = document.querySelector('#btn-refresh');

  if (searchInput) searchInput.addEventListener('input', refreshDashboard);
  if (statusFilter) statusFilter.addEventListener('change', refreshDashboard);
  if (tempFilter) tempFilter.addEventListener('change', refreshDashboard);
  if (sourceFilter) sourceFilter.addEventListener('change', refreshDashboard);
  if (btnRefresh) btnRefresh.addEventListener('click', refreshDashboard);

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = '';
      if (tempFilter) tempFilter.value = '';
      if (sourceFilter) sourceFilter.value = '';
      refreshDashboard();
    });
  }

  // Initial Data Load
  refreshDashboard();
}
