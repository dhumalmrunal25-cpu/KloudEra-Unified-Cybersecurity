import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

/* =========================================================
   STORAGE
========================================================= */

const STORAGE = {
  account: "kloudera_account",
  org: "kloudera_organization",
  logged: "kloudera_logged_in",
  dpdp: "kloudera_dpdp_controls",
  risks: "kloudera_risks",
  assets: "kloudera_assets",
  vulns: "kloudera_vulnerabilities",
  audits: "kloudera_audits",
  policies: "kloudera_policies",
  iso: "kloudera_iso_controls",
  configs: "kloudera_module_config",
  activities: "kloudera_activity",
};

const MODULES = [
  "EDR",
  "SIEM",
  "SOC",
];

const BASE_DPDP = [
  {
    id: "DPDP-001",
    name: "Personal Data Inventory",
    description:
      "Identify and maintain records of personal data processed by the organization.",
  },
  {
    id: "DPDP-002",
    name: "Consent Management",
    description:
      "Document lawful consent collection, management and withdrawal mechanisms.",
  },
  {
    id: "DPDP-003",
    name: "Data Principal Rights",
    description:
      "Maintain processes for access, correction and other applicable data principal rights.",
  },
  {
    id: "DPDP-004",
    name: "Data Retention",
    description:
      "Define and enforce appropriate retention, archival and deletion periods.",
  },
  {
    id: "DPDP-005",
    name: "Data Breach Management",
    description:
      "Maintain incident detection, response and applicable breach notification procedures.",
  },
  {
    id: "DPDP-006",
    name: "Data Security Safeguards",
    description:
      "Apply reasonable technical and organizational safeguards to protect personal data.",
  },
].map((item) => ({
  ...item,
  status: "Pending",
  owner: "",
  evidence: "",
}));

const BASE_ISO = [
  "Context & scope",
  "Leadership & governance",
  "Risk assessment",
  "Asset management",
  "Access control",
  "Incident management",
  "Business continuity",
  "Supplier security",
  "Monitoring & measurement",
  "Continual improvement",
].map((name, index) => ({
  id: `ISO-${String(index + 1).padStart(3, "0")}`,
  name,
  status: "Not Started",
  owner: "",
  evidence: "",
}));

/* =========================================================
   HELPERS
========================================================= */

const read = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error("Unable to save local data.");
  }
};

const uid = (prefix = "ID") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const percent = (value, total) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const downloadFile = (content, filename, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const safeFilename = (value) =>
  String(value || "organization")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

/* =========================================================
   APP
========================================================= */

function App() {
  const [screen, setScreen] = useState(() =>
    localStorage.getItem(STORAGE.logged) === "true" ? "portal" : "auth"
  );

  const [authMode, setAuthMode] = useState("login");

  const [account, setAccount] = useState(() =>
    read(STORAGE.account, {
      email: "",
      password: "",
      fullName: "",
      role: "Administrator",
    })
  );

  const [org, setOrg] = useState(() => read(STORAGE.org, null));

  const [dpdp, setDpdp] = useState(() =>
    read(STORAGE.dpdp, BASE_DPDP)
  );

  const [risks, setRisks] = useState(() =>
    read(STORAGE.risks, [])
  );

  const [assets, setAssets] = useState(() =>
    read(STORAGE.assets, [])
  );

  const [vulns, setVulns] = useState(() =>
    read(STORAGE.vulns, [])
  );

  const [audits, setAudits] = useState(() =>
    read(STORAGE.audits, [])
  );

  const [policies, setPolicies] = useState(() =>
    read(STORAGE.policies, [])
  );

  const [iso, setIso] = useState(() =>
    read(STORAGE.iso, BASE_ISO)
  );

  const [configs, setConfigs] = useState(() =>
    read(STORAGE.configs, {})
  );

  const [activity, setActivity] = useState(() =>
    read(STORAGE.activities, [])
  );

  const [page, setPage] = useState("Dashboard");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");

  /* =======================================================
     PERSIST EVERYTHING
  ======================================================= */

  useEffect(() => write(STORAGE.account, account), [account]);
  useEffect(() => write(STORAGE.dpdp, dpdp), [dpdp]);
  useEffect(() => write(STORAGE.risks, risks), [risks]);
  useEffect(() => write(STORAGE.assets, assets), [assets]);
  useEffect(() => write(STORAGE.vulns, vulns), [vulns]);
  useEffect(() => write(STORAGE.audits, audits), [audits]);
  useEffect(() => write(STORAGE.policies, policies), [policies]);
  useEffect(() => write(STORAGE.iso, iso), [iso]);
  useEffect(() => write(STORAGE.configs, configs), [configs]);
  useEffect(
    () => write(STORAGE.activities, activity.slice(0, 50)),
    [activity]
  );

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast("");
    }, 2800);

    return () => clearTimeout(timer);
  }, [toast]);

  /* =======================================================
     NOTIFICATIONS / ACTIVITY
  ======================================================= */

  const notify = (message) => setToast(message);

  const log = (message, type = "info") => {
    setActivity((current) => [
      {
        id: uid("ACT"),
        message,
        type,
        time: new Date().toLocaleString(),
      },
      ...current,
    ]);
  };

  /* =======================================================
     AUTH
  ======================================================= */

  const login = (event) => {
    event.preventDefault();

    const saved = read(STORAGE.account, null);

    if (!saved?.email || !saved?.password) {
      notify("No account found. Create an organization workspace first.");
      setAuthMode("signup");
      return;
    }

    if (
      account.email.trim().toLowerCase() !==
        saved.email.trim().toLowerCase() ||
      account.password !== saved.password
    ) {
      notify("Incorrect email or password.");
      return;
    }

    setAccount(saved);
    localStorage.setItem(STORAGE.logged, "true");

    const savedOrg = read(STORAGE.org, null);
    setOrg(savedOrg);

    setScreen(savedOrg ? "portal" : "setup");
  };

  const signup = (event) => {
    event.preventDefault();

    if (!account.fullName?.trim()) {
      notify("Enter your full name.");
      return;
    }

    if (!account.email?.trim()) {
      notify("Enter your business email.");
      return;
    }

    if (!account.password || account.password.length < 6) {
      notify("Password must contain at least 6 characters.");
      return;
    }

    const existing = read(STORAGE.account, null);

    if (existing?.email) {
      if (
        existing.email.toLowerCase() !==
        account.email.trim().toLowerCase()
      ) {
        notify(
          "An account already exists in this browser. Sign in with that account."
        );
        setAuthMode("login");
        return;
      }
    }

    const savedAccount = {
      ...account,
      email: account.email.trim().toLowerCase(),
      role: "Administrator",
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    setAccount(savedAccount);
    write(STORAGE.account, savedAccount);

    setScreen("setup");
  };

  const finishSetup = (data) => {
    const previous = read(STORAGE.org, null);

    const finalOrganization = {
      ...data,
      id: previous?.id || uid("ORG"),
      createdAt: previous?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrg(finalOrganization);
    write(STORAGE.org, finalOrganization);

    localStorage.setItem(STORAGE.logged, "true");

    if (!localStorage.getItem(STORAGE.dpdp)) {
      write(STORAGE.dpdp, BASE_DPDP);
      setDpdp(BASE_DPDP);
    }

    if (!localStorage.getItem(STORAGE.iso)) {
      write(STORAGE.iso, BASE_ISO);
      setIso(BASE_ISO);
    }

    log(
      `Organization ${finalOrganization.organizationName} configured`
    );

    notify("Organization workspace is ready.");
    setScreen("portal");
  };

  const logout = () => {
    /*
      IMPORTANT:
      We only remove the login session.
      Account + organization + records stay saved.
    */
    localStorage.removeItem(STORAGE.logged);
    setScreen("auth");
    setAuthMode("login");
    setProfileOpen(false);
    notify("Signed out. Your workspace is still saved.");
  };

  /* =======================================================
     CALCULATIONS
  ======================================================= */

  const dpdpStats = useMemo(() => {
    const total = dpdp.length;

    const compliant = dpdp.filter(
      (item) => item.status === "Compliant"
    ).length;

    const inProgress = dpdp.filter(
      (item) => item.status === "In Progress"
    ).length;

    const pending = dpdp.filter(
      (item) => item.status === "Pending"
    ).length;

    const assessed = compliant + inProgress;

    return {
      total,
      compliant,
      inProgress,
      pending,
      assessed,
      score: percent(compliant, total),
      completion: percent(assessed, total),
    };
  }, [dpdp]);

  const riskStats = useMemo(() => {
    const open = risks.filter(
      (item) => item.status !== "Closed"
    );

    return {
      total: risks.length,
      open: open.length,
      critical: open.filter(
        (item) => item.severity === "Critical"
      ).length,
      high: open.filter(
        (item) => item.severity === "High"
      ).length,
      closed: risks.filter(
        (item) => item.status === "Closed"
      ).length,
    };
  }, [risks]);

  const vulnStats = useMemo(() => {
    const open = vulns.filter(
      (item) => item.status !== "Resolved"
    );

    return {
      total: vulns.length,
      open: open.length,
      critical: open.filter(
        (item) => item.severity === "Critical"
      ).length,
      high: open.filter(
        (item) => item.severity === "High"
      ).length,
      resolved: vulns.filter(
        (item) => item.status === "Resolved"
      ).length,
    };
  }, [vulns]);

  const isoStats = useMemo(() => {
    const implemented = iso.filter(
      (item) => item.status === "Implemented"
    ).length;

    const inProgress = iso.filter(
      (item) => item.status === "In Progress"
    ).length;

    const notStarted = iso.filter(
      (item) => item.status === "Not Started"
    ).length;

    return {
      total: iso.length,
      implemented,
      inProgress,
      notStarted,
      completion: percent(
        implemented + inProgress,
        iso.length
      ),
      score: percent(implemented, iso.length),
    };
  }, [iso]);

  const overall = useMemo(() => {
    /*
      No fake score is generated.
      Only configured/assessed areas contribute.
    */
    const scores = [];

    if (dpdpStats.assessed > 0) {
      scores.push(dpdpStats.score);
    }

    if (iso.some((item) => item.status !== "Not Started")) {
      scores.push(isoStats.score);
    }

    if (risks.length > 0) {
      scores.push(
        percent(riskStats.closed, riskStats.total)
      );
    }

    if (vulns.length > 0) {
      scores.push(
        percent(vulnStats.resolved, vulnStats.total)
      );
    }

    if (scores.length === 0) {
      return null;
    }

    return Math.round(
      scores.reduce((sum, value) => sum + value, 0) /
        scores.length
    );
  }, [
    dpdpStats,
    isoStats,
    riskStats,
    vulnStats,
    risks.length,
    vulns.length,
    iso,
  ]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const searchText = search.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!searchText) return [];

    const result = [];

    policies.forEach((item) => {
      if (
        `${item.name} ${item.owner} ${item.status}`
          .toLowerCase()
          .includes(searchText)
      ) {
        result.push({
          type: "Policy",
          title: item.name,
          page: "GRC",
        });
      }
    });

    risks.forEach((item) => {
      if (
        `${item.title} ${item.category} ${item.severity} ${item.status}`
          .toLowerCase()
          .includes(searchText)
      ) {
        result.push({
          type: "Risk",
          title: item.title,
          page: "Risk Management",
        });
      }
    });

    assets.forEach((item) => {
      if (
        `${item.name} ${item.type} ${item.environment} ${item.owner}`
          .toLowerCase()
          .includes(searchText)
      ) {
        result.push({
          type: "Asset",
          title: item.name,
          page: "Assets",
        });
      }
    });

    vulns.forEach((item) => {
      if (
        `${item.title} ${item.asset} ${item.severity} ${item.status}`
          .toLowerCase()
          .includes(searchText)
      ) {
        result.push({
          type: "Vulnerability",
          title: item.title,
          page: "Vulnerabilities",
        });
      }
    });

    dpdp.forEach((item) => {
      if (
        `${item.id} ${item.name} ${item.status} ${item.owner}`
          .toLowerCase()
          .includes(searchText)
      ) {
        result.push({
          type: "DPDP",
          title: item.name,
          page: "DPDP",
        });
      }
    });

    return result.slice(0, 8);
  }, [
    searchText,
    policies,
    risks,
    assets,
    vulns,
    dpdp,
  ]);

  /* =======================================================
     BACKUP / RESTORE
  ======================================================= */

  const exportWorkspace = () => {
    const workspace = {
      version: 1,
      exportedAt: new Date().toISOString(),
      account,
      organization: org,
      dpdp,
      risks,
      assets,
      vulnerabilities: vulns,
      audits,
      policies,
      iso,
      configs,
      activities: activity,
    };

    downloadFile(
      JSON.stringify(workspace, null, 2),
      `${safeFilename(org?.organizationName)}_cybersecure_backup.json`,
      "application/json"
    );

    log("Workspace backup exported");
    notify("Workspace backup downloaded.");
  };

  const importWorkspace = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);

        if (!data || typeof data !== "object") {
          throw new Error("Invalid backup");
        }

        if (data.account) {
          setAccount(data.account);
          write(STORAGE.account, data.account);
        }

        if (data.organization) {
          setOrg(data.organization);
          write(STORAGE.org, data.organization);
        }

        if (Array.isArray(data.dpdp)) {
          setDpdp(data.dpdp);
          write(STORAGE.dpdp, data.dpdp);
        }

        if (Array.isArray(data.risks)) {
          setRisks(data.risks);
          write(STORAGE.risks, data.risks);
        }

        if (Array.isArray(data.assets)) {
          setAssets(data.assets);
          write(STORAGE.assets, data.assets);
        }

        if (Array.isArray(data.vulnerabilities)) {
          setVulns(data.vulnerabilities);
          write(STORAGE.vulns, data.vulnerabilities);
        }

        if (Array.isArray(data.audits)) {
          setAudits(data.audits);
          write(STORAGE.audits, data.audits);
        }

        if (Array.isArray(data.policies)) {
          setPolicies(data.policies);
          write(STORAGE.policies, data.policies);
        }

        if (Array.isArray(data.iso)) {
          setIso(data.iso);
          write(STORAGE.iso, data.iso);
        }

        if (data.configs) {
          setConfigs(data.configs);
          write(STORAGE.configs, data.configs);
        }

        if (Array.isArray(data.activities)) {
          setActivity(data.activities);
          write(STORAGE.activities, data.activities);
        }

        localStorage.setItem(STORAGE.logged, "true");
        setScreen("portal");

        notify("Workspace restored successfully.");
      } catch {
        notify("Invalid CyberSecure backup file.");
      }
    };

    reader.readAsText(file);

    event.target.value = "";
  };

  /* =======================================================
     REPORT
  ======================================================= */

  const generateReport = () => {
    const organizationName =
      org?.organizationName || "Organization";

    const generated = new Date().toLocaleString();

    const dpdpRows = dpdp
      .map(
        (item) =>
          `${item.id} | ${item.name} | ${item.status} | ${
            item.owner || "Unassigned"
          } | ${item.evidence || "No evidence recorded"}`
      )
      .join("\n");

    const riskRows =
      risks.length > 0
        ? risks
            .map(
              (item) =>
                `${item.title} | ${item.category} | ${item.severity} | ${item.status} | ${
                  item.owner || "Unassigned"
                }`
            )
            .join("\n")
        : "No risk records";

    const vulnRows =
      vulns.length > 0
        ? vulns
            .map(
              (item) =>
                `${item.title} | ${item.asset || "Not linked"} | ${
                  item.severity
                } | ${item.status}`
            )
            .join("\n")
        : "No vulnerability records";

    const report = `
KLOUDERA CYBERSECURE
UNIFIED CYBERSECURITY WORKSPACE
============================================================

ORGANIZATION
------------------------------------------------------------
Organization: ${organizationName}
Industry: ${org?.industry || "Not configured"}
Company Size: ${org?.companySize || "Not configured"}
Country: ${org?.country || "Not configured"}
Primary Contact: ${org?.primaryContact || "Not configured"}
Business Email: ${org?.businessEmail || "Not configured"}

REPORT INFORMATION
------------------------------------------------------------
Generated: ${generated}
Organization ID: ${org?.id || "Not available"}

SECURITY POSTURE
------------------------------------------------------------
Overall Security Score: ${
      overall === null ? "Not assessed" : `${overall}%`
    }

DPDP Compliance Score: ${dpdpStats.score}%
DPDP Assessment Completion: ${dpdpStats.completion}%
DPDP Controls Compliant: ${dpdpStats.compliant}/${dpdpStats.total}
DPDP Controls In Progress: ${dpdpStats.inProgress}
DPDP Controls Pending: ${dpdpStats.pending}

ISO 27001
------------------------------------------------------------
Implementation Score: ${isoStats.score}%
Assessment Completion: ${isoStats.completion}%
Implemented: ${isoStats.implemented}/${isoStats.total}
In Progress: ${isoStats.inProgress}
Not Started: ${isoStats.notStarted}

RISK REGISTER
------------------------------------------------------------
Total Risks: ${riskStats.total}
Open Risks: ${riskStats.open}
Critical Open Risks: ${riskStats.critical}
High Open Risks: ${riskStats.high}
Closed Risks: ${riskStats.closed}

${riskRows}

VULNERABILITIES
------------------------------------------------------------
Total Findings: ${vulnStats.total}
Open Findings: ${vulnStats.open}
Critical Open Findings: ${vulnStats.critical}
High Open Findings: ${vulnStats.high}
Resolved Findings: ${vulnStats.resolved}

${vulnRows}

ASSETS
------------------------------------------------------------
Registered Assets: ${assets.length}
Critical Assets: ${
      assets.filter((item) => item.critical === "Yes").length
    }
Production Assets: ${
      assets.filter(
        (item) => item.environment === "Production"
      ).length
    }
Data Assets: ${
      assets.filter((item) => item.type === "Data").length
    }

GRC
------------------------------------------------------------
Policies: ${policies.length}
Audits: ${audits.length}

DPDP CONTROL REGISTER
------------------------------------------------------------
${dpdpRows}

ISO CONTROL REGISTER
------------------------------------------------------------
${iso
  .map(
    (item) =>
      `${item.id} | ${item.name} | ${item.status} | ${
        item.owner || "Unassigned"
      }`
  )
  .join("\n")}

MODULE CONFIGURATION
------------------------------------------------------------
${MODULES.map((module) => {
  const config = configs[module];

  return `${module}: ${
    config?.configured ? "Configured" : "Not configured"
  }${config?.provider ? ` | Provider: ${config.provider}` : ""}${
    config?.endpoint ? ` | Endpoint: ${config.endpoint}` : ""
  }`;
}).join("\n")}

============================================================
This report is generated from records currently stored in
the organization workspace. No random dashboard values are
used.
============================================================
`;

    downloadFile(
      report.trim(),
      `${safeFilename(
        organizationName
      )}_security_report.txt`
    );

    log("Security report generated");
    notify("Current security report generated.");
  };

  const printReport = () => {
    const organizationName =
      org?.organizationName || "Organization";

    const html = `
      <!doctype html>
      <html>
      <head>
        <title>${organizationName} Security Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #27233d;
            line-height: 1.5;
          }
          h1 { color: #5140ad; }
          h2 {
            margin-top: 28px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
          }
          .metric {
            display: inline-block;
            border: 1px solid #ddd;
            border-radius: 10px;
            padding: 14px 18px;
            margin: 6px;
            min-width: 130px;
          }
          .metric strong {
            display: block;
            font-size: 24px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background: #f1edff;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <h1>KloudEra CyberSecure</h1>
        <p><strong>Organization:</strong> ${organizationName}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

        <h2>Security Posture</h2>

        <div class="metric">
          <span>Overall</span>
          <strong>${
            overall === null ? "N/A" : `${overall}%`
          }</strong>
        </div>

        <div class="metric">
          <span>DPDP</span>
          <strong>${dpdpStats.score}%</strong>
        </div>

        <div class="metric">
          <span>ISO</span>
          <strong>${isoStats.score}%</strong>
        </div>

        <div class="metric">
          <span>Open Risks</span>
          <strong>${riskStats.open}</strong>
        </div>

        <div class="metric">
          <span>Open Vulnerabilities</span>
          <strong>${vulnStats.open}</strong>
        </div>

        <h2>DPDP Controls</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Control</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            ${dpdp
              .map(
                (item) => `
                <tr>
                  <td>${item.id}</td>
                  <td>${item.name}</td>
                  <td>${item.status}</td>
                  <td>${item.owner || "Unassigned"}</td>
                  <td>${item.evidence || "Not recorded"}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>

        <h2>Risk Register</h2>
        <table>
          <thead>
            <tr>
              <th>Risk</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              risks.length
                ? risks
                    .map(
                      (item) => `
                      <tr>
                        <td>${item.title}</td>
                        <td>${item.category}</td>
                        <td>${item.severity}</td>
                        <td>${item.status}</td>
                      </tr>
                    `
                    )
                    .join("")
                : `<tr><td colspan="4">No risk records.</td></tr>`
            }
          </tbody>
        </table>

        <h2>Vulnerabilities</h2>
        <table>
          <thead>
            <tr>
              <th>Finding</th>
              <th>Asset</th>
              <th>Severity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              vulns.length
                ? vulns
                    .map(
                      (item) => `
                      <tr>
                        <td>${item.title}</td>
                        <td>${item.asset || "Not linked"}</td>
                        <td>${item.severity}</td>
                        <td>${item.status}</td>
                      </tr>
                    `
                    )
                    .join("")
                : `<tr><td colspan="4">No vulnerability records.</td></tr>`
            }
          </tbody>
        </table>

        <h2>Inventory</h2>
        <p>Assets: ${assets.length}</p>
        <p>Policies: ${policies.length}</p>
        <p>Audits: ${audits.length}</p>
        <p>ISO controls: ${iso.length}</p>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
      notify("Allow pop-ups to print the report.");
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();

    log("Printable security report opened");
    notify("Report opened for PDF printing.");
  };

  /* =======================================================
     MODAL HELPERS
  ======================================================= */

  const closeModal = () => setModal(null);

  const saveModal = (value) => {
    if (!modal?.save) return;

    modal.save(value);
    setModal(null);
  };

  /* =======================================================
     AUTH / SETUP
  ======================================================= */

  if (screen === "auth") {
    return (
      <>
        <Auth
          mode={authMode}
          setMode={setAuthMode}
          account={account}
          setAccount={setAccount}
          onLogin={login}
          onSignup={signup}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  if (screen === "setup") {
    return (
      <>
        <Setup
          initial={org}
          account={account}
          onComplete={finishSetup}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navigation = [
    "Dashboard",
    "GRC",
    "DPDP",
    "Risk Management",
    "Audit Management",
    "ISO 27001",
    "EDR",
    "SIEM",
    "SOC",
    "Vulnerabilities",
    "Assets",
    "Reports",
    "Settings",
  ];

  const initials =
    account?.fullName
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SA";

  const commonProps = {
    org,
    account,
    dpdp,
    dpdpStats,
    risks,
    riskStats,
    assets,
    vulns,
    vulnStats,
    audits,
    policies,
    iso,
    isoStats,
    configs,
    activity,
    overall,
    setPage,
    setModal,
    notify,
    log,
    setDpdp,
    setRisks,
    setAssets,
    setVulns,
    setAudits,
    setPolicies,
    setIso,
    setConfigs,
    search,
    searchResults,
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">K</div>

          <div>
            <strong>KloudEra</strong>
            <span>CyberSecure</span>
          </div>
        </div>

        <div className="org-mini">
          <div className="org-avatar">
            {(org?.organizationName || "O")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <b>{org?.organizationName || "Organization"}</b>
            <small>
              {org?.industry || "Security workspace"}
            </small>
          </div>
        </div>

        <div className="menu-label">MAIN MENU</div>

        <nav>
          {navigation.map((item) => (
            <button
              type="button"
              key={item}
              className={`nav-item ${
                page === item ? "active" : ""
              } ${item === "DPDP" ? "child" : ""}`}
              onClick={() => {
                setPage(item);
                setProfileOpen(false);
              }}
            >
              <Icon name={item} />
              <span>{item}</span>

              {item === "GRC" && <em>⌄</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <div className="status-dot" />

            <div>
              <strong>
                {dpdpStats.assessed > 0
                  ? "Assessment Active"
                  : "Workspace Active"}
              </strong>

              <span>
                {dpdpStats.assessed > 0
                  ? `${dpdpStats.assessed}/${dpdpStats.total} DPDP controls assessed`
                  : "Awaiting security assessment"}
              </span>
            </div>
          </div>

          <div className="sidebar-version">
            KloudEra CyberSecure · v1.0
          </div>

          <button
            type="button"
            className="nav-item logout-item"
            onClick={logout}
          >
            <Icon name="Logout" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">
            <span>KloudEra CyberSecure</span>
            <b>/</b>
            <strong>{page}</strong>
          </div>

          <div className="top-actions">
            <div className="search-wrap">
              <div className="search">
                <span>⌕</span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search workspace..."
                />
              </div>

              {searchText && (
                <div className="search-results">
                  {searchResults.length ? (
                    searchResults.map((result, index) => (
                      <button
                        type="button"
                        key={`${result.type}-${index}`}
                        onClick={() => {
                          setPage(result.page);
                          setSearch("");
                        }}
                      >
                        <span>{result.type}</span>
                        <b>{result.title}</b>
                      </button>
                    ))
                  ) : (
                    <div className="search-empty">
                      No matching records.
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                notify(
                  activity[0]?.message ||
                    "No recent workspace activity."
                )
              }
              aria-label="Notifications"
            >
              🔔
            </button>

            <div className="profile-wrap">
              <button
                type="button"
                className="profile"
                onClick={() =>
                  setProfileOpen((value) => !value)
                }
              >
                <div className="avatar">{initials}</div>

                <div>
                  <b>{account?.fullName || "Security Admin"}</b>
                  <small>
                    {account?.role || "Administrator"}
                  </small>
                </div>

                <span>⌄</span>
              </button>

              {profileOpen && (
                <div className="profile-menu">
                  <b>
                    {org?.primaryContact ||
                      account?.fullName ||
                      "Security Admin"}
                  </b>

                  <span>
                    {org?.businessEmail ||
                      account?.email ||
                      ""}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setPage("Settings");
                      setProfileOpen(false);
                    }}
                  >
                    Account settings
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="content">
          {renderPage(page, commonProps)}
        </section>
      </main>

      {toast && <div className="toast">{toast}</div>}

      {modal && (
        <Modal
          data={modal}
          close={closeModal}
          save={saveModal}
        />
      )}
    </div>
  );
}

/* =========================================================
   AUTH
========================================================= */

function Auth({
  mode,
  setMode,
  account,
  setAccount,
  onLogin,
  onSignup,
}) {
  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="brand-large">
          <div className="brand-mark big">K</div>

          <div>
            <strong>KloudEra</strong>
            <span>CyberSecure</span>
          </div>
        </div>

        <div className="auth-copy">
          <span className="eyebrow">
            UNIFIED CYBERSECURITY
          </span>

          <h1>
            One workspace for your organization's security
            posture.
          </h1>

          <p>
            Manage compliance, governance, risk, assets,
            vulnerabilities and security operations from one
            professional workspace.
          </p>

          <div className="auth-points">
            <span>◉ Organization-first security</span>
            <span>◉ Evidence-driven compliance</span>
            <span>◉ Calculated security visibility</span>
          </div>
        </div>
      </div>

      <div className="auth-form">
        <div className="form-card">
          <span className="eyebrow">
            {mode === "login"
              ? "WELCOME BACK"
              : "GET STARTED"}
          </span>

          <h2>
            {mode === "login"
              ? "Sign in to CyberSecure"
              : "Create your workspace"}
          </h2>

          <p>
            {mode === "login"
              ? "Access your organization's saved security workspace."
              : "Create the administrator account for your organization."}
          </p>

          <form
            onSubmit={
              mode === "login" ? onLogin : onSignup
            }
          >
            {mode === "signup" && (
              <label>
                Full name
                <input
                  value={account.fullName || ""}
                  onChange={(event) =>
                    setAccount({
                      ...account,
                      fullName: event.target.value,
                    })
                  }
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </label>
            )}

            <label>
              Business email
              <input
                type="email"
                value={account.email || ""}
                onChange={(event) =>
                  setAccount({
                    ...account,
                    email: event.target.value,
                  })
                }
                placeholder="you@company.com"
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={account.password || ""}
                onChange={(event) =>
                  setAccount({
                    ...account,
                    password: event.target.value,
                  })
                }
                placeholder="Minimum 6 characters"
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
              />
            </label>

            <button
              className="primary-button"
              type="submit"
            >
              {mode === "login"
                ? "Sign in"
                : "Continue"}

              <span>→</span>
            </button>
          </form>

          <div className="switch-auth">
            {mode === "login" ? (
              <>
                New organization?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                >
                  Create workspace
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <small className="auth-footer">
          KloudEra Technologies · Secure, Innovate,
          Transform
        </small>
      </div>
    </div>
  );
}

/* =========================================================
   ORGANIZATION SETUP
========================================================= */

function Setup({ initial, account, onComplete }) {
  const [form, setForm] = useState(
    initial || {
      organizationName: "",
      industry: "Technology",
      customIndustry: "",
      companySize: "",
      primaryContact: account?.fullName || "",
      businessEmail: account?.email || "",
      country: "India",
    }
  );

  const change = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submit = (event) => {
    event.preventDefault();

    if (!form.organizationName.trim()) {
      alert("Organization name is required.");
      return;
    }

    if (!form.industry) {
      alert("Industry is required.");
      return;
    }

    if (
      form.industry === "Other" &&
      !form.customIndustry.trim()
    ) {
      alert("Enter the custom industry.");
      return;
    }

    if (!form.companySize) {
      alert("Select company size.");
      return;
    }

    if (!form.primaryContact.trim()) {
      alert("Primary contact is required.");
      return;
    }

    if (!form.businessEmail.trim()) {
      alert("Business email is required.");
      return;
    }

    const finalIndustry =
      form.industry === "Other"
        ? form.customIndustry.trim()
        : form.industry;

    onComplete({
      ...form,
      industry: finalIndustry,
      customIndustry:
        form.industry === "Other"
          ? form.customIndustry.trim()
          : "",
    });
  };

  return (
    <div className="setup-shell">
      <div className="setup-card">
        <div className="setup-head">
          <div className="brand-large">
            <div className="brand-mark">K</div>

            <div>
              <strong>KloudEra</strong>
              <span>CyberSecure</span>
            </div>
          </div>

          <span className="step-pill">
            Organization setup · 1 of 1
          </span>
        </div>

        <div className="setup-progress">
          <i />
        </div>

        <div className="setup-title">
          <span className="eyebrow">
            ORGANIZATION PROFILE
          </span>

          <h1>Tell us about your organization</h1>

          <p>
            These details identify the organization being
            assessed and are used across your workspace.
          </p>
        </div>

        <form
          className="setup-form"
          onSubmit={submit}
        >
          <label>
            Organization name *
            <input
              value={form.organizationName}
              onChange={(event) =>
                change(
                  "organizationName",
                  event.target.value
                )
              }
              placeholder="e.g. Acme Technologies"
            />
          </label>

          <label>
            Industry *
            <select
              value={form.industry}
              onChange={(event) =>
                change("industry", event.target.value)
              }
            >
              <option>Technology</option>
              <option>Financial Services</option>
              <option>Healthcare</option>
              <option>Education</option>
              <option>Manufacturing</option>
              <option>Retail</option>
              <option>Government</option>
              <option>Other</option>
            </select>
          </label>

          {form.industry === "Other" && (
            <label>
              Custom industry *
              <input
                value={form.customIndustry}
                onChange={(event) =>
                  change(
                    "customIndustry",
                    event.target.value
                  )
                }
                placeholder="Enter industry"
              />
            </label>
          )}

          <label>
            Company size *
            <select
              value={form.companySize}
              onChange={(event) =>
                change(
                  "companySize",
                  event.target.value
                )
              }
            >
              <option value="">
                Select employee range
              </option>
              <option>1–50</option>
              <option>51–200</option>
              <option>201–500</option>
              <option>501–1000</option>
              <option>1001+</option>
            </select>
          </label>

          <label>
            Primary contact *
            <input
              value={form.primaryContact}
              onChange={(event) =>
                change(
                  "primaryContact",
                  event.target.value
                )
              }
              placeholder="Full name"
            />
          </label>

          <label>
            Business email *
            <input
              type="email"
              value={form.businessEmail}
              onChange={(event) =>
                change(
                  "businessEmail",
                  event.target.value
                )
              }
              placeholder="security@company.com"
            />
          </label>

          <label>
            Country
            <input
              value={form.country}
              onChange={(event) =>
                change("country", event.target.value)
              }
            />
          </label>

          <button
            className="primary-button setup-submit"
            type="submit"
          >
            Enter security workspace
            <span>→</span>
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE ROUTER
========================================================= */

function renderPage(page, props) {
  switch (page) {
    case "Dashboard":
      return <Dashboard {...props} />;

    case "GRC":
      return <GRC {...props} />;

    case "DPDP":
      return <DPDP {...props} />;

    case "Risk Management":
      return <Risks {...props} />;

    case "Audit Management":
      return <Audits {...props} />;

    case "ISO 27001":
      return <ISO {...props} />;

    case "EDR":
    case "SIEM":
    case "SOC":
      return (
        <SecurityModule
          {...props}
          module={page}
        />
      );

    case "Vulnerabilities":
      return <Vulnerabilities {...props} />;

    case "Assets":
      return <Assets {...props} />;

    case "Reports":
      return <Reports {...props} />;

    case "Settings":
      return <Settings {...props} />;

    default:
      return <Dashboard {...props} />;
  }
}

/* =========================================================
   COMMON UI
========================================================= */

function Header({
  eyebrow,
  title,
  text,
  actions,
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>

      <div className="head-actions">{actions}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon,
  accent,
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${accent || ""}`}>
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </div>
  );
}

function Badge({ value }) {
  const cls = String(value)
    .toLowerCase()
    .replace(/\s+/g, "-");

  return (
    <span className={`badge ${cls}`}>
      {value}
    </span>
  );
}

function Icon({ name }) {
  const icons = {
    Dashboard: "⌂",
    GRC: "◈",
    DPDP: "◎",
    "Risk Management": "△",
    "Audit Management": "□",
    "ISO 27001": "◉",
    EDR: "◫",
    SIEM: "◌",
    SOC: "◍",
    Vulnerabilities: "◇",
    Assets: "▦",
    Reports: "▤",
    Settings: "⚙",
    Logout: "↪",
  };

  return <span>{icons[name] || "•"}</span>;
}

function EmptyState({
  title,
  text,
}) {
  return (
    <div className="empty large">
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}

function DataTable({
  headers,
  rows,
  emptyTitle = "No records found.",
  emptyText = "Add records using the action above.",
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title={emptyTitle}
        text={emptyText}
      />
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="info">
      <span>{label}</span>
      <b>{value || "—"}</b>
    </div>
  );
}

function Activity({ items }) {
  if (!items.length) {
    return (
      <EmptyState
        title="No activity yet"
        text="Actions performed in this workspace will appear here."
      />
    );
  }

  return (
    <div className="activity">
      {items.slice(0, 8).map((item) => (
        <div
          className="activity-row"
          key={item.id}
        >
          <i className={`activity-dot ${item.type}`} />

          <div>
            <b>{item.message}</b>
            <span>{item.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard(p) {
  const overallText =
    p.overall === null
      ? "Not assessed"
      : `${p.overall}%`;

  return (
    <>
      <Header
        eyebrow="SECURITY OVERVIEW"
        title={`Good to see you, ${
          p.account?.fullName || "Security Admin"
        }.`
        }
        text={`${p.org?.organizationName || "Your organization"} · ${
          p.org?.industry || "Security workspace"
        } · ${p.org?.country || "India"}`}
        actions={
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() => p.setPage("Reports")}
            >
              View reports
            </button>

            <button
              type="button"
              className="primary-button compact"
              onClick={() =>
                p.setModal({
                  title: "New DPDP Assessment",
                  kind: "dpdpAssessment",
                  save: () => {
                    p.setDpdp(
                      BASE_DPDP.map((item) => ({
                        ...item,
                        owner:
                          p.account?.fullName ||
                          "",
                        evidence: "",
                        status: "Pending",
                      }))
                    );

                    p.log(
                      "New DPDP assessment started"
                    );

                    p.notify(
                      "New DPDP assessment started."
                    );

                    p.setPage("DPDP");
                  },
                })
              }
            >
              New assessment
            </button>
          </>
        }
      />

      <div className="overview-strip">
        <div>
          <span>Organization</span>
          <b>
            {p.org?.organizationName ||
              "Not configured"}
          </b>
        </div>

        <div>
          <span>Industry</span>
          <b>{p.org?.industry || "—"}</b>
        </div>

        <div>
          <span>Employees</span>
          <b>{p.org?.companySize || "—"}</b>
        </div>

        <div>
          <span>Workspace status</span>
          <b className="status-dot">
            ● Active
          </b>
        </div>
      </div>

      <div className="stats-grid">
        <Stat
          label="Overall security score"
          value={overallText}
          sub={
            p.overall === null
              ? "Complete an assessment to calculate"
              : "Calculated from configured records"
          }
          icon="◈"
        />

        <Stat
          label="DPDP compliance"
          value={`${p.dpdpStats.score}%`}
          sub={`${p.dpdpStats.compliant}/${p.dpdpStats.total} controls compliant`}
          icon="◎"
          accent="green"
        />

        <Stat
          label="Open risks"
          value={p.riskStats.open}
          sub={`${p.riskStats.critical} critical · ${p.riskStats.high} high`}
          icon="△"
          accent="orange"
        />

        <Stat
          label="Open vulnerabilities"
          value={p.vulnStats.open}
          sub={`${p.vulnStats.critical} critical`}
          icon="◇"
          accent="red"
        />
      </div>

      <div className="dashboard-grid">
        <div className="panel score-panel">
          <div className="panel-head">
            <div>
              <b>Security posture</b>
              <span>
                Live calculation from workspace records
              </span>
            </div>

            <span className="live">● Live</span>
          </div>

          <div className="score-wrap">
            <div
              className="score-ring"
              style={{
                "--score":
                  p.overall === null
                    ? "0deg"
                    : `${p.overall * 3.6}deg`,
              }}
            >
              <div>
                <strong>
                  {p.overall === null
                    ? "—"
                    : `${p.overall}%`}
                </strong>

                <span>overall</span>
              </div>
            </div>

            <div className="score-details">
              <div>
                <span>DPDP</span>
                <b>{p.dpdpStats.score}%</b>
              </div>

              <div>
                <span>ISO 27001</span>
                <b>{p.isoStats.score}%</b>
              </div>

              <div>
                <span>Risk closure</span>
                <b>
                  {p.risks.length
                    ? percent(
                        p.riskStats.closed,
                        p.riskStats.total
                      )
                    : 0}
                  %
                </b>
              </div>

              <div>
                <span>Vulnerability resolution</span>
                <b>
                  {p.vulns.length
                    ? percent(
                        p.vulnStats.resolved,
                        p.vulnStats.total
                      )
                    : 0}
                  %
                </b>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <b>Recent activity</b>
              <span>
                Actions recorded in this workspace
              </span>
            </div>
          </div>

          <Activity items={p.activity} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <b>Security modules</b>
            <span>
              Open a module to manage its organization records
            </span>
          </div>
        </div>

        <div className="module-grid">
          {[
            "GRC",
            "DPDP",
            "Risk Management",
            "Audit Management",
            "ISO 27001",
            "EDR",
            "SIEM",
            "SOC",
            "Vulnerabilities",
            "Assets",
          ].map((module) => (
            <button
              type="button"
              className="module-card"
              key={module}
              onClick={() => p.setPage(module)}
            >
              <div className="module-icon">
                <Icon name={module} />
              </div>

              <div>
                <b>{module}</b>

                <span>
                  {moduleSummary(module, p)}
                </span>
              </div>

              <strong>→</strong>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function moduleSummary(module, p) {
  if (module === "DPDP") {
    return `${p.dpdpStats.assessed}/${p.dpdpStats.total} assessed`;
  }

  if (module === "Risk Management") {
    return `${p.riskStats.open} open risks`;
  }

  if (module === "Vulnerabilities") {
    return `${p.vulnStats.open} open findings`;
  }

  if (module === "Assets") {
    return `${p.assets.length} registered assets`;
  }

  if (module === "Audit Management") {
    return `${p.audits.length} audit records`;
  }

  if (module === "ISO 27001") {
    return `${p.isoStats.implemented}/${p.isoStats.total} implemented`;
  }

  if (MODULES.includes(module)) {
    return p.configs[module]?.configured
      ? "Configured"
      : "Configuration required";
  }

  if (module === "GRC") {
    return `${p.policies.length} policies`;
  }

  return "Available";
}

/* =========================================================
   GRC
========================================================= */

function GRC(p) {
  return (
    <>
      <Header
        eyebrow="GOVERNANCE, RISK & COMPLIANCE"
        title="GRC"
        text="Manage governance records, policies and compliance evidence."
        actions={
          <button
            type="button"
            className="primary-button compact"
            onClick={() => p.setModal(formPolicy(p))}
          >
            Add policy
          </button>
        }
      />

      <div className="stats-grid">
        <Stat
          label="Policies"
          value={p.policies.length}
          sub="Organization records"
          icon="▤"
        />

        <Stat
          label="Open risks"
          value={p.riskStats.open}
          sub="From risk register"
          icon="△"
          accent="orange"
        />

        <Stat
          label="DPDP compliance"
          value={`${p.dpdpStats.score}%`}
          sub="Current control score"
          icon="◎"
          accent="green"
        />

        <Stat
          label="Audits"
          value={p.audits.length}
          sub="Recorded audits"
          icon="□"
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <b>Policies</b>
            <span>
              Organization-owned governance records
            </span>
          </div>
        </div>

        <DataTable
          headers={[
            "Policy",
            "Owner",
            "Review date",
            "Status",
            "Actions",
          ]}
          rows={p.policies.map((item) => [
            item.name,
            item.owner,
            item.reviewDate || "—",
            <Badge value={item.status} />,
            <div className="row-actions">
              <button
                type="button"
                className="table-action"
                onClick={() =>
                  p.setModal({
                    title: "Edit policy",
                    kind: "policy",
                    initial: item,
                    save: (value) => {
                      p.setPolicies(
                        p.policies.map((record) =>
                          record.id === item.id
                            ? {
                                ...record,
                                ...value,
                              }
                            : record
                        )
                      );

                      p.log(
                        `Policy ${item.name} updated`
                      );

                      p.notify("Policy updated.");
                    },
                  })
                }
              >
                Edit
              </button>

              <button
                type="button"
                className="table-action danger-text"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this policy?"
                    )
                  ) {
                    p.setPolicies(
                      p.policies.filter(
                        (record) =>
                          record.id !== item.id
                      )
                    );

                    p.log(
                      `Policy ${item.name} deleted`
                    );

                    p.notify("Policy deleted.");
                  }
                }}
              >
                Delete
              </button>
            </div>,
          ])}
          emptyTitle="No policies yet"
          emptyText="Add your first organization policy."
        />
      </div>
    </>
  );
}

/* =========================================================
   DPDP
========================================================= */

function DPDP(p) {
  return (
    <>
      <Header
        eyebrow="GRC / DPDP"
        title="DPDP compliance"
        text="Assess the six baseline controls using your organization's actual evidence."
        actions={
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                p.setModal({
                  title: "New DPDP Assessment",
                  kind: "dpdpAssessment",
                  save: () => {
                    p.setDpdp(
                      BASE_DPDP.map((item) => ({
                        ...item,
                        owner:
                          p.account?.fullName ||
                          "",
                        evidence: "",
                        status: "Pending",
                      }))
                    );

                    p.log(
                      "New DPDP assessment started"
                    );

                    p.notify(
                      "New DPDP assessment started."
                    );
                  },
                })
              }
            >
              New assessment
            </button>

            <button
              type="button"
              className="primary-button compact"
              onClick={() =>
                p.setModal({
                  title: "DPDP Assessment Information",
                  kind: "info",
                  infoTitle:
                    "How the DPDP score works",
                  infoText:
                    "The six baseline controls are predefined assessment areas. Your score is calculated from the statuses you actually assign. Pending controls do not contribute to the compliance score.",
                })
              }
            >
              How scoring works
            </button>
          </>
        }
      />

      <div className="stats-grid">
        <Stat
          label="Compliance score"
          value={`${p.dpdpStats.score}%`}
          sub={`${p.dpdpStats.compliant} compliant`}
          icon="◎"
          accent="green"
        />

        <Stat
          label="Assessment completion"
          value={`${p.dpdpStats.completion}%`}
          sub={`${p.dpdpStats.assessed}/${p.dpdpStats.total} assessed`}
          icon="◈"
        />

        <Stat
          label="In progress"
          value={p.dpdpStats.inProgress}
          sub="Controls being worked on"
          icon="◫"
          accent="orange"
        />

        <Stat
          label="Pending"
          value={p.dpdpStats.pending}
          sub="Controls awaiting assessment"
          icon="!"
          accent="red"
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <b>DPDP control register</b>
            <span>
              Six baseline controls · values come from assessment records
            </span>
          </div>

          <Badge
            value={`${p.dpdpStats.assessed}/${p.dpdpStats.total} assessed`}
          />
        </div>

        <div className="control-list">
          {p.dpdp.map((control) => (
            <div
              className="control-card"
              key={control.id}
            >
              <div className="control-code">
                {control.id}
              </div>

              <div className="control-main">
                <b>{control.name}</b>

                <p>{control.description}</p>

                <small>
                  Owner:{" "}
                  {control.owner || "Not assigned"}
                </small>

                {control.evidence && (
                  <small className="evidence-line">
                    Evidence: {control.evidence}
                  </small>
                )}
              </div>

              <div className="control-status">
                <Badge value={control.status} />

                <select
                  value={control.status}
                  onChange={(event) => {
                    const status =
                      event.target.value;

                    p.setDpdp(
                      p.dpdp.map((item) =>
                        item.id === control.id
                          ? {
                              ...item,
                              status,
                            }
                          : item
                      )
                    );

                    p.log(
                      `${control.id} status changed to ${status}`
                    );

                    p.notify(
                      `${control.id} updated.`
                    );
                  }}
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Compliant</option>
                </select>
              </div>

              <button
                type="button"
                className="table-action"
                onClick={() =>
                  p.setModal({
                    title: `Update ${control.id}`,
                    kind: "evidence",
                    initial: {
                      owner: control.owner || "",
                      evidence:
                        control.evidence || "",
                    },
                    save: (value) => {
                      p.setDpdp(
                        p.dpdp.map((item) =>
                          item.id === control.id
                            ? {
                                ...item,
                                owner:
                                  value.owner,
                                evidence:
                                  value.evidence,
                              }
                            : item
                        )
                      );

                      p.log(
                        `${control.id} evidence updated`
                      );

                      p.notify(
                        `${control.id} evidence saved.`
                      );
                    },
                  })
                }
              >
                Evidence
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   RISKS
========================================================= */

function Risks(p) {
  return (
    <>
      <Header
        eyebrow="RISK MANAGEMENT"
        title="Risk register"
        text="Record, assess and track organization security risks."
        actions={
          <button
            type="button"
            className="primary-button compact"
            onClick={() => p.setModal(formRisk(p))}
          >
            Add risk
          </button>
        }
      />

      <div className="stats-grid">
        <Stat
          label="Total risks"
          value={p.riskStats.total}
          sub="Recorded risks"
          icon="△"
        />

        <Stat
          label="Open risks"
          value={p.riskStats.open}
          sub="Requires attention"
          icon="!"
          accent="orange"
        />

        <Stat
          label="Critical"
          value={p.riskStats.critical}
          sub="Open critical risks"
          icon="!"
          accent="red"
        />

        <Stat
          label="Closed"
          value={p.riskStats.closed}
          sub="Resolved risks"
          icon="✓"
          accent="green"
        />
      </div>

      <div className="panel">
        <DataTable
          headers={[
            "Risk",
            "Category",
            "Severity",
            "Owner",
            "Status",
            "Actions",
          ]}
          rows={p.risks.map((item) => [
            <div>
              <b>{item.title}</b>
              {item.description && (
                <span className="table-sub">
                  {item.description}
                </span>
              )}
            </div>,
            item.category,
            <Badge value={item.severity} />,
            item.owner || "Unassigned",
            <Badge value={item.status} />,
            <div className="row-actions">
              <button
                type="button"
                className="table-action"
                onClick={() =>
                  p.setModal({
                    title: "Edit risk",
                    kind: "risk",
                    initial: item,
                    save: (value) => {
                      p.setRisks(
                        p.risks.map((record) =>
                          record.id === item.id
                            ? {
                                ...record,
                                ...value,
                              }
                            : record
                        )
                      );

                      p.log(
                        `Risk ${item.title} updated`
                      );

                      p.notify("Risk updated.");
                    },
                  })
                }
              >
                Edit
              </button>

              <button
                type="button"
                className="table-action danger-text"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this risk?"
                    )
                  ) {
                    p.setRisks(
                      p.risks.filter(
                        (record) =>
                          record.id !== item.id
                      )
                    );

                    p.notify("Risk deleted.");
                  }
                }}
              >
                Delete
              </button>
            </div>,
          ])}
          emptyTitle="No risks registered"
          emptyText="Add an actual organization risk to begin the register."
        />
      </div>
    </>
  );
}

/* =========================================================
   AUDITS
========================================================= */

function Audits(p) {
  return (
    <>
      <Header
        eyebrow="AUDIT MANAGEMENT"
        title="Audit management"
        text="Maintain audit records and track their status."
        actions={
          <button
            type="button"
            className="primary-button compact"
            onClick={() => p.setModal(formAudit(p))}
          >
            New audit
          </button>
        }
      />

      <div className="stats-grid">
        <Stat
          label="Total audits"
          value={p.audits.length}
          sub="Audit records"
          icon="□"
        />

        <Stat
          label="Planned"
          value={
            p.audits.filter(
              (item) => item.status === "Planned"
            ).length
          }
          sub="Upcoming audits"
          icon="◫"
          accent="orange"
        />

        <Stat
          label="In progress"
          value={
            p.audits.filter(
              (item) => item.status === "In Progress"
            ).length
          }
          sub="Active audits"
          icon="◌"
        />

        <Stat
          label="Completed"
          value={
            p.audits.filter(
              (item) => item.status === "Completed"
            ).length
          }
          sub="Completed records"
          icon="✓"
          accent="green"
        />
      </div>

      <div className="panel">
        <DataTable
          headers={[
            "Audit",
            "Type",
            "Date",
            "Lead",
            "Status",
            "Actions",
          ]}
          rows={p.audits.map((item) => [
            item.name,
            item.type,
            item.date || "—",
            item.lead || "Unassigned",
            <Badge value={item.status} />,
            <div className="row-actions">
              <button
                type="button"
                className="table-action"
                onClick={() =>
                  p.setModal({
                    title: "Edit audit",
                    kind: "audit",
                    initial: item,
                    save: (value) => {
                      p.setAudits(
                        p.audits.map((record) =>
                          record.id === item.id
                            ? {
                                ...record,
                                ...value,
                              }
                            : record
                        )
                      );

                      p.notify("Audit updated.");
                    },
                  })
                }
              >
                Edit
              </button>

              <button
                type="button"
                className="table-action danger-text"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this audit?"
                    )
                  ) {
                    p.setAudits(
                      p.audits.filter(
                        (record) =>
                          record.id !== item.id
                      )
                    );

                    p.notify("Audit deleted.");
                  }
                }}
              >
                Delete
              </button>
            </div>,
          ])}
          emptyTitle="No audits recorded"
          emptyText="Create an audit record to begin tracking."
        />
      </div>
    </>
  );
}

/* =========================================================
   ISO 27001
========================================================= */

function ISO(p) {
  return (
    <>
      <Header
        eyebrow="ISO 27001"
        title="ISO 27001 readiness"
        text="Track implementation status for the workspace ISO control baseline."
        actions={
          <button
            type="button"
            className="primary-button compact"
            onClick={() =>
              p.setModal({
                title: "Add ISO control",
                kind: "iso",
                initial: {
                  name: "",
                  status: "Not Started",
                  owner: "",
                  evidence: "",
                },
                save: (value) => {
                  p.setIso([
                    ...p.iso,
                    {
                      id: uid("ISO"),
                      ...value,
                    },
                  ]);

                  p.log(
                    `ISO control ${value.name} added`
                  );

                  p.notify(
                    "ISO control added."
                  );
                },
              })
            }
          >
            Add control
          </button>
        }
      />

      <div className="stats-grid">
        <Stat
          label="Implementation"
          value={`${p.isoStats.score}%`}
          sub={`${p.isoStats.implemented}/${p.isoStats.total} implemented`}
          icon="◉"
          accent="green"
        />

        <Stat
          label="Assessment completion"
          value={`${p.isoStats.completion}%`}
          sub="Implemented + in progress"
          icon="◈"
        />

        <Stat
          label="In progress"
          value={p.isoStats.inProgress}
          sub="Active controls"
          icon="◫"
          accent="orange"
        />

        <Stat
          label="Not started"
          value={p.isoStats.notStarted}
          sub="Awaiting implementation"
          icon="!"
          accent="red"
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <b>ISO control register</b>
            <span>
              Update each control using actual implementation evidence.
            </span>
          </div>

          <Badge
            value={`${p.isoStats.implemented}/${p.isoStats.total} implemented`}
          />
        </div>

        <div className="control-list">
          {p.iso.map((item) => (
            <div
              className="control-card"
              key={item.id}
            >
              <div className="control-code">
                {item.id}
              </div>

              <div className="control-main">
                <b>{item.name}</b>

                <p>
                  Track the organization's implementation
                  and evidence for this area.
                </p>

                <small>
                  Owner:{" "}
                  {item.owner || "Not assigned"}
                </small>
              </div>

              <div className="control-status">
                <Badge value={item.status} />

                <select
                  value={item.status}
                  onChange={(event) => {
                    const status =
                      event.target.value;

                    p.setIso(
                      p.iso.map((record) =>
                        record.id === item.id
                          ? {
                              ...record,
                              status,
                            }
                          : record
                      )
                    );

                    p.notify(
                      `${item.id} updated.`
                    );
                  }}
                >
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Implemented</option>
                </select>
              </div>

              <button
                type="button"
                className="table-action"
                onClick={() =>
                  p.setModal({
                    title: `Update ${item.id}`,
                    kind: "evidence",
                    initial: {
                      owner: item.owner || "",
                      evidence:
                        item.evidence || "",
                    },
                    save: (value) => {
                      p.setIso(
                        p.iso.map((record) =>
                          record.id === item.id
                            ? {
                                ...record,
                                ...value,
                              }
                            : record
                        )
                      );

                      p.notify(
                        `${item.id} evidence saved.`
                      );
                    },
                  })
                }
              >
                Evidence
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   EDR / SIEM / SOC
========================================================= */

function SecurityModule({
  module,
  ...p
}) {
  const config = p.configs[module] || {};

  return (
    <>
      <Header
        eyebrow={`SECURITY OPERATIONS / ${module}`}
        title={module}
        text={`Configure the organization's ${module} integration and operational coverage.`}
        actions={
          <button
            type="button"
            className="primary-button compact"
            onClick={() =>
              p.setModal({
                title: `Configure ${module}`,
                kind: "module",
                initial: {
                  provider: config.provider || "",
                  endpoint: config.endpoint || "",
                  coverage: config.coverage || "",
                  owner:
                    config.owner ||
                    p.account?.fullName ||
                    "",
                  notes: config.notes || "",
                },
                save: (value) => {
                  p.setConfigs({
                    ...p.configs,
                    [module]: {
                      ...value,
                      configured: true,
                      configuredAt:
                        new Date().toISOString(),
                    },
                  });

                  p.log(
                    `${module} configuration updated`
                  );

                  p.notify(
                    `${module} configured successfully.`
                  );
                },
              })
            }
          >
            {config.configured
              ? "Edit configuration"
              : "Configure module"}
          </button>
        }
      />

      <div className="module-hero">
        <div className="module-hero-icon">
          <Icon name={module} />
        </div>

        <div>
          <span className="eyebrow">
            MODULE STATUS
          </span>

          <h2>{module}</h2>

          <p>
            {config.configured
              ? "Configuration is stored in this organization workspace."
              : "No configuration has been entered yet."}
          </p>
        </div>

        <Badge
          value={
            config.configured
              ? "Configured"
              : "Not configured"
          }
        />
      </div>

      {config.configured ? (
        <>
          <div className="config-grid">
            <Info
              label="Provider / Platform"
              value={config.provider}
            />

            <Info
              label="Endpoint / System"
              value={config.endpoint}
            />

            <Info
              label="Coverage"
              value={config.coverage}
            />

            <Info
              label="Owner"
              value={config.owner}
            />
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <b>Operational notes</b>
                <span>
                  Configuration notes entered by the organization
                </span>
              </div>
            </div>

            <div className="notes-box">
              {config.notes ||
                "No operational notes recorded."}
            </div>
          </div>
        </>
      ) : (
        <div className="panel">
          <EmptyState
            title={`${module} requires configuration`}
            text="Enter the real provider, endpoint/system, coverage and owner information to activate this workspace module."
          />

          <div className="center-action">
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                p.setModal({
                  title: `Configure ${module}`,
                  kind: "module",
                  initial: {
                    provider: "",
                    endpoint: "",
                    coverage: "",
                    owner:
                      p.account?.fullName ||
                      "",
                    notes: "",
                  },
                  save: (value) => {
                    p.setConfigs({
                      ...p.configs,
                      [module]: {
                        ...value,
                        configured: true,
                        configuredAt:
                          new Date().toISOString(),
                      },
                    });

                    p.notify(
                      `${module} configured successfully.`
                    );
                  },
                })
              }
            >
              Start configuration
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   VULNERABILITIES
========================================================= */

function Vulnerabilities(p) {
  return (
    <>
      <Header
        eyebrow="VULNERABILITY MANAGEMENT"
        title="Vulnerabilities"
        text="Record actual security findings and track remediation."
        actions={
          <button
            type="button"
            className="primary-button compact"
            onClick={() => p.setModal(formVulnerability(p))}
          >
            Add finding
          </button>
        }
      />

      <div className="stats-grid">
        <Stat
          label="Total findings"
          value={p.vulnStats.total}
          sub="Recorded findings"
          icon="◇"
        />

        <Stat
          label="Open"
          value={p.vulnStats.open}
          sub="Requires remediation"
          icon="!"
          accent="orange"
        />

        <Stat
          label="Critical"
          value={p.vulnStats.critical}
          sub="Open critical findings"
          icon="!"
          accent="red"
        />

        <Stat
          label="Resolved"
          value={p.vulnStats.resolved}
          sub="Resolved findings"
          icon="✓"
          accent="green"
        />
      </div>

      <div className="panel">
        <DataTable
          headers={[
            "Finding",
            "Asset",
            "Severity",
            "Owner",
            "Status",
            "Actions",
          ]}
          rows={p.vulns.map((item) => [
            <div>
              <b>{item.title}</b>
              {item.description && (
                <span className="table-sub">
                  {item.description}
                </span>
              )}
            </div>,
            item.asset || "Not linked",
            <Badge value={item.severity} />,
            item.owner || "Unassigned",
            <Badge value={item.status} />,
            <div className="row-actions">
              <button
                type="button"
                className="table-action"
                onClick={() =>
                  p.setModal({
                    title: "Edit vulnerability",
                    kind: "vuln",
                    initial: item,
                    save: (value) => {
                      p.setVulns(
                        p.vulns.map((record) =>
                          record.id === item.id
                            ? {
                                ...record,
                                ...value,
                              }
                            : record
                        )
                      );

                      p.notify(
                        "Vulnerability updated."
                      );
                    },
                  })
                }
              >
                Edit
              </button>

              <button
                type="button"
                className="table-action danger-text"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this vulnerability?"
                    )
                  ) {
                    p.setVulns(
                      p.vulns.filter(
                        (record) =>
                          record.id !== item.id
                      )
                    );

                    p.notify(
                      "Vulnerability deleted."
                    );
                  }
                }}
              >
                Delete
              </button>
            </div>,
          ])}
          emptyTitle="No vulnerabilities recorded"
          emptyText="Add an actual security finding to begin remediation tracking."
        />
      </div>
    </>
  );
}

/* =========================================================
   ASSETS
========================================================= */

function Assets(p) {
  return (
    <>
      <Header
        eyebrow="ASSET MANAGEMENT"
        title="Assets"
        text="Maintain the organization's actual technology and data inventory."
        actions={
          <button
            type="button"
            className="primary-button compact"
            onClick={() => p.setModal(formAsset(p))}
          >
            Add asset
          </button>
        }
      />

      <div className="stats-grid">
        <Stat
          label="Registered assets"
          value={p.assets.length}
          sub="Inventory records"
          icon="▦"
        />

        <Stat
          label="Critical assets"
          value={
            p.assets.filter(
              (item) => item.critical === "Yes"
            ).length
          }
          sub="Marked critical"
          icon="!"
          accent="red"
        />

        <Stat
          label="Production"
          value={
            p.assets.filter(
              (item) =>
                item.environment === "Production"
            ).length
          }
          sub="Production systems"
          icon="◈"
        />

        <Stat
          label="Data assets"
          value={
            p.assets.filter(
              (item) => item.type === "Data"
            ).length
          }
          sub="Data-classified assets"
          icon="▤"
        />
      </div>

      <div className="panel">
        <DataTable
          headers={[
            "Asset",
            "Type",
            "Environment",
            "Owner",
            "Critical",
            "Actions",
          ]}
          rows={p.assets.map((item) => [
            item.name,
            item.type,
            item.environment,
            item.owner || "Unassigned",
            <Badge
              value={
                item.critical === "Yes"
                  ? "Critical"
                  : "Standard"
              }
            />,
            <div className="row-actions">
              <button
                type="button"
                className="table-action"
                onClick={() =>
                  p.setModal({
                    title: "Edit asset",
                    kind: "asset",
                    initial: item,
                    save: (value) => {
                      p.setAssets(
                        p.assets.map((record) =>
                          record.id === item.id
                            ? {
                                ...record,
                                ...value,
                              }
                            : record
                        )
                      );

                      p.notify("Asset updated.");
                    },
                  })
                }
              >
                Edit
              </button>

              <button
                type="button"
                className="table-action danger-text"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this asset?"
                    )
                  ) {
                    p.setAssets(
                      p.assets.filter(
                        (record) =>
                          record.id !== item.id
                      )
                    );

                    p.notify("Asset deleted.");
                  }
                }}
              >
                Delete
              </button>
            </div>,
          ])}
          emptyTitle="No assets registered"
          emptyText="Add the organization's real assets to the inventory."
        />
      </div>
    </>
  );
}

/* =========================================================
   REPORTS
========================================================= */
function Reports(p) {
  const [showReport, setShowReport] = useState(false);

  const dpdpStats = p.dpdpStats || {
    score: 0,
    completion: 0,
    compliant: 0,
    inProgress: 0,
    pending: 0,
    total: 0
  };

  const riskStats = p.riskStats || {
    open: 0,
    critical: 0
  };

  const vulnStats = p.vulnStats || {
    open: 0,
    critical: 0
  };

  const isoStats = p.isoStats || {
    implemented: 0,
    total: 0,
    percentage: 0
  };

  const dpdp = Array.isArray(p.dpdp) ? p.dpdp : [];
  const risks = Array.isArray(p.risks) ? p.risks : [];
  const vulns = Array.isArray(p.vulns) ? p.vulns : [];
  const assets = Array.isArray(p.assets) ? p.assets : [];
  const policies = Array.isArray(p.policies) ? p.policies : [];
  const audits = Array.isArray(p.audits) ? p.audits : [];
  const iso = Array.isArray(p.iso) ? p.iso : [];

  const org = p.org || {};

  const handleGenerateReport = () => {
    setShowReport(true);
  };

  const handlePrint = () => {
    window.print();
  };

  if (showReport) {
    return (
      <div className="report-preview-page">

        <div className="report-preview-toolbar no-print">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowReport(false)}
          >
            ← Back to Reports
          </button>

          <div className="report-toolbar-right">
            <span className="report-generated-label">
              Report generated: {new Date().toLocaleString()}
            </span>

            <button
              type="button"
              className="primary-button"
              onClick={handlePrint}
            >
              Print / Save as PDF
            </button>
          </div>
        </div>

        <div className="report-document">

          <div className="report-cover">

            <div>
              <div className="report-brand">
                KLOUDERA CYBERSECURE
              </div>

              <h1>
                Security &amp; Compliance
                <br />
                Assessment Report
              </h1>

              <p className="report-cover-subtitle">
                Organization Security Posture Report
              </p>
            </div>

            <div className="report-cover-details">

              <div>
                <span>ORGANIZATION</span>
                <strong>
                  {org.organizationName || "Organization"}
                </strong>
              </div>

              <div>
                <span>INDUSTRY</span>
                <strong>
                  {org.industry || "Not configured"}
                </strong>
              </div>

              <div>
                <span>ORGANIZATION SIZE</span>
                <strong>
                  {org.companySize || "Not configured"}
                </strong>
              </div>

              <div>
                <span>GENERATED</span>
                <strong>
                  {new Date().toLocaleString()}
                </strong>
              </div>

            </div>

          </div>

          <div className="report-document-body">

            <section className="report-document-section">

              <div className="report-section-heading">
                <span>01</span>

                <div>
                  <h2>Executive Summary</h2>
                  <p>
                    Current calculated security and compliance posture
                    based on records configured in KloudEra CyberSecure.
                  </p>
                </div>
              </div>

              <div className="report-metric-grid">

                <div className="report-metric">
                  <span>DPDP Compliance</span>
                  <strong>{dpdpStats.score}%</strong>
                  <small>
                    {dpdpStats.compliant} compliant of{" "}
                    {dpdpStats.total} controls
                  </small>
                </div>

                <div className="report-metric">
                  <span>DPDP Completion</span>
                  <strong>{dpdpStats.completion}%</strong>
                  <small>
                    {dpdpStats.compliant + dpdpStats.inProgress} assessed
                    of {dpdpStats.total}
                  </small>
                </div>

                <div className="report-metric">
                  <span>Open Risks</span>
                  <strong>{riskStats.open}</strong>
                  <small>
                    {riskStats.critical} critical
                  </small>
                </div>

                <div className="report-metric">
                  <span>Open Vulnerabilities</span>
                  <strong>{vulnStats.open}</strong>
                  <small>
                    {vulnStats.critical} critical
                  </small>
                </div>

              </div>

              <div className="report-explanation">
                <strong>How these values are calculated</strong>

                <p>
                  DPDP compliance is calculated as the number of
                  controls marked Compliant divided by the total
                  number of baseline DPDP controls. DPDP completion
                  includes both Compliant and In Progress controls.
                  Employee count does not determine these percentages.
                </p>
              </div>

            </section>


            <section className="report-document-section">

              <div className="report-section-heading">
                <span>02</span>

                <div>
                  <h2>Organization Profile</h2>
                  <p>
                    Organization information currently configured
                    in the security workspace.
                  </p>
                </div>
              </div>

              <div className="report-profile-grid">

                <div>
                  <span>Organization Name</span>
                  <strong>
                    {org.organizationName || "Not configured"}
                  </strong>
                </div>

                <div>
                  <span>Industry</span>
                  <strong>
                    {org.industry || "Not configured"}
                  </strong>
                </div>

                <div>
                  <span>Company Size</span>
                  <strong>
                    {org.companySize || "Not configured"}
                  </strong>
                </div>

                <div>
                  <span>Country</span>
                  <strong>
                    {org.country || "India"}
                  </strong>
                </div>

                <div>
                  <span>Primary Contact</span>
                  <strong>
                    {org.primaryContact || "Not configured"}
                  </strong>
                </div>

                <div>
                  <span>Business Email</span>
                  <strong>
                    {org.businessEmail || "Not configured"}
                  </strong>
                </div>

              </div>

            </section>


            <section className="report-document-section">

              <div className="report-section-heading">
                <span>03</span>

                <div>
                  <h2>DPDP Assessment</h2>
                  <p>
                    Current status of the organization's baseline
                    DPDP controls.
                  </p>
                </div>
              </div>

              <div className="report-status-grid">

                <div>
                  <strong>{dpdpStats.compliant}</strong>
                  <span>Compliant</span>
                </div>

                <div>
                  <strong>{dpdpStats.inProgress}</strong>
                  <span>In Progress</span>
                </div>

                <div>
                  <strong>{dpdpStats.pending}</strong>
                  <span>Pending</span>
                </div>

                <div>
                  <strong>{dpdpStats.total}</strong>
                  <span>Total Controls</span>
                </div>

              </div>

              <div className="report-table-wrapper">

                <table className="professional-report-table">

                  <thead>
                    <tr>
                      <th>Control</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Owner</th>
                    </tr>
                  </thead>

                  <tbody>

                    {dpdp.length > 0 ? (
                      dpdp.map((control) => (
                        <tr key={control.id || control.name}>
                          <td>
                            <strong>
                              {control.id || "—"}
                            </strong>
                            <br />
                            {control.name || "Unnamed control"}
                          </td>

                          <td>
                            {control.description ||
                              "No description available."}
                          </td>

                          <td>
                            <span
                              className={
                                "report-status-badge " +
                                String(
                                  control.status || "Pending"
                                )
                                  .toLowerCase()
                                  .replace(/\s+/g, "-")
                              }
                            >
                              {control.status || "Pending"}
                            </span>
                          </td>

                          <td>
                            {control.owner || "Security Admin"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4">
                          No DPDP control records available.
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </section>


            <section className="report-document-section">

              <div className="report-section-heading">
                <span>04</span>

                <div>
                  <h2>ISO 27001</h2>
                  <p>
                    Current implementation status of configured
                    ISO 27001 control areas.
                  </p>
                </div>
              </div>

              <div className="report-single-highlight">
                <strong>
                  {isoStats.percentage || 0}%
                </strong>

                <div>
                  <span>Implementation Progress</span>
                  <small>
                    {isoStats.implemented || 0} of{" "}
                    {isoStats.total || iso.length} controls implemented
                  </small>
                </div>
              </div>

              <div className="report-table-wrapper">

                <table className="professional-report-table">

                  <thead>
                    <tr>
                      <th>Control</th>
                      <th>Status</th>
                      <th>Owner</th>
                    </tr>
                  </thead>

                  <tbody>

                    {iso.length > 0 ? (
                      iso.map((control) => (
                        <tr key={control.id || control.name}>
                          <td>
                            <strong>
                              {control.id || "—"}
                            </strong>
                            <br />
                            {control.name || "ISO Control"}
                          </td>

                          <td>
                            <span className="report-status-badge">
                              {control.status || "Not Started"}
                            </span>
                          </td>

                          <td>
                            {control.owner || "Security Admin"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3">
                          No ISO 27001 control records available.
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </section>


            <section className="report-document-section">

              <div className="report-section-heading">
                <span>05</span>

                <div>
                  <h2>Risk Management</h2>
                  <p>
                    Risks currently registered in the organization
                    security workspace.
                  </p>
                </div>
              </div>

              <div className="report-status-grid">

                <div>
                  <strong>{riskStats.open}</strong>
                  <span>Open Risks</span>
                </div>

                <div>
                  <strong>{riskStats.critical}</strong>
                  <span>Critical Risks</span>
                </div>

                <div>
                  <strong>{risks.length}</strong>
                  <span>Total Records</span>
                </div>

              </div>

              <div className="report-table-wrapper">

                <table className="professional-report-table">

                  <thead>
                    <tr>
                      <th>Risk</th>
                      <th>Category</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Owner</th>
                    </tr>
                  </thead>

                  <tbody>

                    {risks.length > 0 ? (
                      risks.map((risk) => (
                        <tr key={risk.id || risk.title}>
                          <td>
                            {risk.title || "Untitled risk"}
                          </td>

                          <td>
                            {risk.category || "—"}
                          </td>

                          <td>
                            {risk.severity || "—"}
                          </td>

                          <td>
                            {risk.status || "Open"}
                          </td>

                          <td>
                            {risk.owner || "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">
                          No risks have been registered.
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </section>


            <section className="report-document-section">

              <div className="report-section-heading">
                <span>06</span>

                <div>
                  <h2>Vulnerability Management</h2>
                  <p>
                    Vulnerabilities currently recorded in the workspace.
                  </p>
                </div>
              </div>

              <div className="report-status-grid">

                <div>
                  <strong>{vulnStats.open}</strong>
                  <span>Open</span>
                </div>

                <div>
                  <strong>{vulnStats.critical}</strong>
                  <span>Critical</span>
                </div>

                <div>
                  <strong>{vulns.length}</strong>
                  <span>Total Records</span>
                </div>

              </div>

              <div className="report-table-wrapper">

                <table className="professional-report-table">

                  <thead>
                    <tr>
                      <th>Vulnerability</th>
                      <th>Asset</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Owner</th>
                    </tr>
                  </thead>

                  <tbody>

                    {vulns.length > 0 ? (
                      vulns.map((vulnerability) => (
                        <tr
                          key={
                            vulnerability.id ||
                            vulnerability.title
                          }
                        >
                          <td>
                            {vulnerability.title ||
                              "Untitled vulnerability"}
                          </td>

                          <td>
                            {vulnerability.asset || "—"}
                          </td>

                          <td>
                            {vulnerability.severity || "—"}
                          </td>

                          <td>
                            {vulnerability.status || "Open"}
                          </td>

                          <td>
                            {vulnerability.owner || "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">
                          No vulnerabilities have been registered.
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </section>


            <section className="report-document-section">

              <div className="report-section-heading">
                <span>07</span>

                <div>
                  <h2>Security Inventory</h2>
                  <p>
                    Current organizational security records.
                  </p>
                </div>
              </div>

              <div className="report-inventory-grid">

                <div>
                  <strong>{assets.length}</strong>
                  <span>Assets</span>
                </div>

                <div>
                  <strong>{policies.length}</strong>
                  <span>Policies</span>
                </div>

                <div>
                  <strong>{audits.length}</strong>
                  <span>Audits</span>
                </div>

                <div>
                  <strong>{risks.length}</strong>
                  <span>Risk Records</span>
                </div>

                <div>
                  <strong>{vulns.length}</strong>
                  <span>Vulnerability Records</span>
                </div>

              </div>

            </section>


            <section className="report-document-section">

              <div className="report-section-heading">
                <span>08</span>

                <div>
                  <h2>Conclusion &amp; Next Actions</h2>
                  <p>
                    Suggested operational focus based on current
                    recorded security data.
                  </p>
                </div>
              </div>

              <div className="report-explanation">

                <ul>

                  {dpdpStats.pending > 0 && (
                    <li>
                      Complete the remaining pending DPDP controls
                      and attach appropriate evidence.
                    </li>
                  )}

                  {riskStats.open > 0 && (
                    <li>
                      Review and prioritize the organization's
                      open risks, particularly critical risks.
                    </li>
                  )}

                  {vulnStats.open > 0 && (
                    <li>
                      Review open vulnerabilities and track them
                      through remediation.
                    </li>
                  )}

                  {(isoStats.percentage || 0) < 100 && (
                    <li>
                      Continue implementation of the remaining
                      ISO 27001 control areas.
                    </li>
                  )}

                  {assets.length === 0 && (
                    <li>
                      Register organizational assets to establish
                      an accurate security inventory.
                    </li>
                  )}

                  {dpdpStats.pending === 0 &&
                    riskStats.open === 0 &&
                    vulnStats.open === 0 &&
                    (isoStats.percentage || 0) === 100 && (
                      <li>
                        Continue periodic review and maintain
                        evidence for all implemented controls.
                      </li>
                    )}

                </ul>

              </div>

            </section>


            <div className="report-footer">

              <strong>
                KloudEra CyberSecure
              </strong>

              <span>
                Security &amp; Compliance Assessment Report
              </span>

              <span>
                Generated {new Date().toLocaleString()}
              </span>

            </div>

          </div>

        </div>

      </div>
    );
  }

  return (
    <>
      <Header
        eyebrow="REPORTING"
        title="Security Reports"
        text="Generate a professional security and compliance report from the organization's current records."
        actions={
          <button
            type="button"
            className="primary-button compact"
            onClick={handleGenerateReport}
          >
            Generate Report
          </button>
        }
      />

      <div className="report-card">

        <div className="report-icon">
          ▤
        </div>

        <div className="report-card-content">

          <span className="eyebrow">
            SECURITY &amp; COMPLIANCE
          </span>

          <h2>
            {org.organizationName || "Organization"} Security Report
          </h2>

          <p>
            Generate a current report covering DPDP compliance,
            ISO 27001 implementation, risks, vulnerabilities,
            assets, policies, and audits.
          </p>

        </div>

        <button
          type="button"
          className="primary-button"
          onClick={handleGenerateReport}
        >
          View Report
        </button>

      </div>

      <div className="report-summary-grid">

        <div className="report-summary-card">
          <span>DPDP Compliance</span>
          <strong>{dpdpStats.score}%</strong>
          <small>
            {dpdpStats.compliant} / {dpdpStats.total} compliant
          </small>
        </div>

        <div className="report-summary-card">
          <span>DPDP Completion</span>
          <strong>{dpdpStats.completion}%</strong>
          <small>
            {dpdpStats.compliant + dpdpStats.inProgress} /{" "}
            {dpdpStats.total} assessed
          </small>
        </div>

        <div className="report-summary-card">
          <span>Open Risks</span>
          <strong>{riskStats.open}</strong>
          <small>
            {riskStats.critical} critical
          </small>
        </div>

        <div className="report-summary-card">
          <span>Open Vulnerabilities</span>
          <strong>{vulnStats.open}</strong>
          <small>
            {vulnStats.critical} critical
          </small>
        </div>

      </div>

      <div className="report-section-list">

        <div className="report-list-item">
          <div>
            <span>DPDP</span>
            <h3>Data Protection Assessment</h3>
            <p>
              {dpdpStats.total} baseline controls configured.
            </p>
          </div>

          <strong>
            {dpdpStats.score}%
          </strong>
        </div>

        <div className="report-list-item">
          <div>
            <span>ISO 27001</span>
            <h3>Information Security Controls</h3>
            <p>
              {isoStats.implemented || 0} implemented controls.
            </p>
          </div>

          <strong>
            {isoStats.percentage || 0}%
          </strong>
        </div>

        <div className="report-list-item">
          <div>
            <span>RISK MANAGEMENT</span>
            <h3>Organizational Risk Register</h3>
            <p>
              {risks.length} total risk records.
            </p>
          </div>

          <strong>
            {riskStats.open}
          </strong>
        </div>

        <div className="report-list-item">
          <div>
            <span>VULNERABILITIES</span>
            <h3>Vulnerability Register</h3>
            <p>
              {vulns.length} vulnerability records.
            </p>
          </div>

          <strong>
            {vulnStats.open}
          </strong>
        </div>

        <div className="report-list-item">
          <div>
            <span>INVENTORY</span>
            <h3>Assets, Policies &amp; Audits</h3>
            <p>
              {assets.length} assets · {policies.length} policies ·{" "}
              {audits.length} audits
            </p>
          </div>

          <strong>
            {assets.length}
          </strong>
        </div>

      </div>

      <div className="report-info-box">

        <div className="report-info-icon">
          i
        </div>

        <div>
          <strong>
            Report data is calculated from your workspace
          </strong>

          <p>
            The report uses the organization's current records.
            Compliance percentages are calculated from control
            statuses and are not generated from employee count.
          </p>
        </div>

      </div>
    </>
  );
}
/* =========================================================
   SETTINGS
========================================================= */

function Settings(p) {
  const [form, setForm] = useState({
    ...(p.org || {}),
  });

  const save = (event) => {
    event.preventDefault();

    if (!form.organizationName?.trim()) {
      p.notify("Organization name is required.");
      return;
    }

    const updated = {
      ...p.org,
      ...form,
      updatedAt: new Date().toISOString(),
    };

    write(STORAGE.org, updated);

    window.location.reload();
  };

  return (
    <>
      <Header
        eyebrow="ADMINISTRATION"
        title="Settings"
        text="Manage organization information and workspace data."
      />

      <div className="settings-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <b>Organization profile</b>
              <span>
                Details used across the CyberSecure workspace
              </span>
            </div>
          </div>

          <form
            className="settings-form"
            onSubmit={save}
          >
            <label>
              Organization name
              <input
                value={form.organizationName || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    organizationName:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              Industry
              <input
                value={form.industry || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    industry: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Company size
              <input
                value={form.companySize || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    companySize:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              Country
              <input
                value={form.country || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    country: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Primary contact
              <input
                value={form.primaryContact || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    primaryContact:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              Business email
              <input
                type="email"
                value={form.businessEmail || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    businessEmail:
                      event.target.value,
                  })
                }
              />
            </label>

            <button
              type="submit"
              className="primary-button"
            >
              Save organization
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <b>Workspace persistence</b>
              <span>
                Keep your demo data when moving from localhost to the public site
              </span>
            </div>
          </div>

          <div className="persistence-box">
            <div>
              <strong>Browser workspace storage</strong>

              <span>
                Your account, organization, assessments and
                records are saved locally in this browser.
              </span>
            </div>

            <Badge value="Active" />
          </div>

          <div className="backup-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={p.exportWorkspace}
            >
              Export workspace
            </button>

            <label className="secondary-button import-button">
              Import workspace
              <input
                type="file"
                accept="application/json"
                onChange={p.importWorkspace}
              />
            </label>
          </div>

          <div className="settings-note">
            <b>Moving from localhost</b>

            <span>
              localhost and your public domain have separate
              browser storage. Export your workspace here
              before moving, then import the JSON backup on
              the public site.
            </span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <b>Workspace data summary</b>
            <span>
              Current stored records
            </span>
          </div>
        </div>

        <div className="settings-list">
          <Info
            label="DPDP controls"
            value={p.dpdp.length}
          />

          <Info
            label="Policies"
            value={p.policies.length}
          />

          <Info
            label="Risks"
            value={p.risks.length}
          />

          <Info
            label="Vulnerabilities"
            value={p.vulns.length}
          />

          <Info
            label="Assets"
            value={p.assets.length}
          />

          <Info
            label="Audits"
            value={p.audits.length}
          />

          <Info
            label="ISO controls"
            value={p.iso.length}
          />
        </div>
      </div>
    </>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  data,
  close,
  save,
}) {
  const [form, setForm] = useState(
    data.initial || {}
  );

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  if (data.kind === "info") {
    return (
      <div
        className="modal-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            close();
          }
        }}
      >
        <div className="modal">
          <div className="modal-head">
            <div>
              <span className="eyebrow">
                KLOUDERA CYBERSECURE
              </span>

              <h2>{data.infoTitle}</h2>
            </div>

            <button
              type="button"
              className="close"
              onClick={close}
            >
              ×
            </button>
          </div>

          <div className="info-modal">
            <div className="assessment-icon">
              ◎
            </div>

            <p>{data.infoText}</p>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="primary-button"
              onClick={close}
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (data.kind === "dpdpAssessment") {
    return (
      <div
        className="modal-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            close();
          }
        }}
      >
        <div className="modal">
          <div className="modal-head">
            <div>
              <span className="eyebrow">
                KLOUDERA CYBERSECURE
              </span>

              <h2>{data.title}</h2>
            </div>

            <button
              type="button"
              className="close"
              onClick={close}
            >
              ×
            </button>
          </div>

          <div className="assessment-modal">
            <div className="assessment-icon">
              ◎
            </div>

            <h3>
              Start a fresh DPDP assessment?
            </h3>

            <p>
              This resets the six baseline controls to
              Pending. You can then assess each control using
              the organization's actual evidence.
            </p>

            <div className="assessment-warning">
              Existing DPDP statuses and evidence will be
              reset.
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={close}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  data.save({});
                  close();
                }}
              >
                Start assessment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fields = {
    policy: [
      ["name", "Policy name", "text"],
      ["owner", "Owner", "text"],
      ["reviewDate", "Review date", "date"],
      [
        "status",
        "Status",
        "select:Draft|Active|Under Review",
      ],
    ],

    risk: [
      ["title", "Risk title", "text"],
      [
        "category",
        "Category",
        "select:Compliance|Operational|Cybersecurity|Privacy|Third Party",
      ],
      [
        "severity",
        "Severity",
        "select:Low|Medium|High|Critical",
      ],
      ["owner", "Owner", "text"],
      [
        "status",
        "Status",
        "select:Open|In Progress|Closed",
      ],
      [
        "description",
        "Description",
        "textarea",
      ],
    ],

    audit: [
      ["name", "Audit name", "text"],
      [
        "type",
        "Type",
        "select:Internal|External|Regulatory",
      ],
      ["date", "Audit date", "date"],
      ["lead", "Lead", "text"],
      [
        "status",
        "Status",
        "select:Planned|In Progress|Completed",
      ],
    ],

    vuln: [
      ["title", "Finding title", "text"],
      ["asset", "Affected asset", "text"],
      [
        "severity",
        "Severity",
        "select:Low|Medium|High|Critical",
      ],
      ["owner", "Owner", "text"],
      [
        "status",
        "Status",
        "select:Open|In Progress|Resolved",
      ],
      [
        "description",
        "Description",
        "textarea",
      ],
    ],

    asset: [
      ["name", "Asset name", "text"],
      [
        "type",
        "Type",
        "select:Application|Server|Data|Network|Cloud|Endpoint",
      ],
      [
        "environment",
        "Environment",
        "select:Production|Staging|Development|Other",
      ],
      ["owner", "Owner", "text"],
      [
        "critical",
        "Critical asset?",
        "select:Yes|No",
      ],
    ],

    module: [
      ["provider", "Provider / platform", "text"],
      ["endpoint", "Endpoint / system", "text"],
      ["coverage", "Coverage", "text"],
      ["owner", "Owner", "text"],
      [
        "notes",
        "Operational notes",
        "textarea",
      ],
    ],

    evidence: [
      [
        "owner",
        "Owner",
        "text",
      ],
      [
        "evidence",
        "Evidence / implementation notes",
        "textarea",
      ],
    ],

    iso: [
      ["name", "Control name", "text"],
      [
        "status",
        "Status",
        "select:Not Started|In Progress|Implemented",
      ],
      ["owner", "Owner", "text"],
      [
        "evidence",
        "Evidence",
        "textarea",
      ],
    ],
  }[data.kind] || [];

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              KLOUDERA CYBERSECURE
            </span>

            <h2>{data.title}</h2>
          </div>

          <button
            type="button"
            className="close"
            onClick={close}
          >
            ×
          </button>
        </div>

        <div className="modal-form">
          {fields.map(([key, label, type]) => {
            if (type === "textarea") {
              return (
                <label key={key}>
                  {label}

                  <textarea
                    value={form[key] || ""}
                    onChange={(event) =>
                      set(
                        key,
                        event.target.value
                      )
                    }
                    rows="4"
                  />
                </label>
              );
            }

            if (type.startsWith("select:")) {
              const values = type
                .replace("select:", "")
                .split("|");

              return (
                <label key={key}>
                  {label}

                  <select
                    value={
                      form[key] || values[0]
                    }
                    onChange={(event) =>
                      set(
                        key,
                        event.target.value
                      )
                    }
                  >
                    {values.map((value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }

            return (
              <label key={key}>
                {label}

                <input
                  type={type}
                  value={form[key] || ""}
                  onChange={(event) =>
                    set(
                      key,
                      event.target.value
                    )
                  }
                />
              </label>
            );
          })}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={close}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => save(form)}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FORM FACTORIES
========================================================= */

function formPolicy(p) {
  return {
    title: "Add policy",
    kind: "policy",
    initial: {
      name: "",
      owner: p.account?.fullName || "",
      reviewDate: "",
      status: "Draft",
    },
    save: (value) => {
      if (!value.name?.trim()) {
        p.notify("Policy name is required.");
        return;
      }

      const item = {
        id: uid("POL"),
        ...value,
        name: value.name.trim(),
      };

      p.setPolicies([
        ...p.policies,
        item,
      ]);

      p.log(
        `Policy ${item.name} added`
      );

      p.notify("Policy added.");
    },
  };
}

function formRisk(p) {
  return {
    title: "Add risk",
    kind: "risk",
    initial: {
      title: "",
      category: "Cybersecurity",
      severity: "Medium",
      owner: p.account?.fullName || "",
      status: "Open",
      description: "",
    },
    save: (value) => {
      if (!value.title?.trim()) {
        p.notify("Risk title is required.");
        return;
      }

      const item = {
        id: uid("RISK"),
        ...value,
        title: value.title.trim(),
      };

      p.setRisks([
        ...p.risks,
        item,
      ]);

      p.log(
        `Risk ${item.title} added`
      );

      p.notify("Risk added.");
    },
  };
}

function formAudit(p) {
  return {
    title: "New audit",
    kind: "audit",
    initial: {
      name: "",
      type: "Internal",
      date: "",
      lead: p.account?.fullName || "",
      status: "Planned",
    },
    save: (value) => {
      if (!value.name?.trim()) {
        p.notify("Audit name is required.");
        return;
      }

      const item = {
        id: uid("AUD"),
        ...value,
        name: value.name.trim(),
      };

      p.setAudits([
        ...p.audits,
        item,
      ]);

      p.log(
        `Audit ${item.name} created`
      );

      p.notify("Audit created.");
    },
  };
}

function formVulnerability(p) {
  return {
    title: "Add vulnerability",
    kind: "vuln",
    initial: {
      title: "",
      asset: "",
      severity: "Medium",
      owner: p.account?.fullName || "",
      status: "Open",
      description: "",
    },
    save: (value) => {
      if (!value.title?.trim()) {
        p.notify(
          "Finding title is required."
        );
        return;
      }

      const item = {
        id: uid("VULN"),
        ...value,
        title: value.title.trim(),
      };

      p.setVulns([
        ...p.vulns,
        item,
      ]);

      p.log(
        `Vulnerability ${item.title} added`
      );

      p.notify(
        "Vulnerability added."
      );
    },
  };
}

function formAsset(p) {
  return {
    title: "Add asset",
    kind: "asset",
    initial: {
      name: "",
      type: "Application",
      environment: "Production",
      owner: p.account?.fullName || "",
      critical: "No",
    },
    save: (value) => {
      if (!value.name?.trim()) {
        p.notify("Asset name is required.");
        return;
      }

      const item = {
        id: uid("AST"),
        ...value,
        name: value.name.trim(),
      };

      p.setAssets([
        ...p.assets,
        item,
      ]);

      p.log(
        `Asset ${item.name} added`
      );

      p.notify("Asset added.");
    },
  };
}

export default App;