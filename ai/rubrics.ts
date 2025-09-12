export type RubricPerspective = "founder" | "investor_diligence" | "acquirer_mna";

export type RubricCategory = {
  name: string;
  documents: string[];
};

export type MetricSpec = {
  key: string;
  label: string;
  description: string;
  formula?: string;
  unit?: string;
  required?: boolean;
};

export type Rubric = {
  perspective: RubricPerspective;
  requiredDocuments: RubricCategory[];
  requiredMetrics: MetricSpec[];
  sections: string[]; // Expected output sections
  principles: string[]; // Advisor operating principles
};

// Core metrics used across perspectives
const CORE_METRICS: MetricSpec[] = [
  { key: "mrr", label: "MRR/ARR", description: "Monthly/annual recurring revenue.", unit: "$", required: true },
  { key: "growth_rate", label: "Growth Rate", description: "MoM/YoY revenue growth.", formula: "(Revenue_t - Revenue_(t-1)) / Revenue_(t-1)", unit: "%", required: true },
  { key: "gross_margin", label: "Gross Margin", description: "(Revenue - COGS) / Revenue.", unit: "%", required: true },
  { key: "burn", label: "Net Burn", description: "Monthly net cash outflow.", unit: "$", required: true },
  { key: "runway", label: "Runway", description: "Months of cash left at current burn.", formula: "Cash / Burn", unit: "months", required: true },
  { key: "ltv", label: "LTV", description: "Lifetime value per customer.", unit: "$" },
  { key: "cac", label: "CAC", description: "Customer acquisition cost.", unit: "$" },
  { key: "ltv_cac", label: "LTV/CAC", description: "Efficiency ratio.", formula: "LTV / CAC" },
  { key: "payback", label: "Payback Period", description: "Months to recover CAC.", unit: "months" },
  { key: "gdr", label: "Gross Dollar Retention", description: "Revenue retained before expansion.", unit: "%", required: true },
  { key: "ndr", label: "Net Dollar Retention", description: "Revenue retained including expansion.", unit: "%", required: true },
  { key: "logo_retention", label: "Logo Retention", description: "Customer count retention.", unit: "%" },
  { key: "arpu", label: "ARPU", description: "Average revenue per user.", unit: "$" },
  { key: "sales_cycle", label: "Sales Cycle", description: "Median days from first meeting to close.", unit: "days" },
  { key: "win_rate", label: "Win Rate", description: "Closed-won / total opportunities.", unit: "%" },
  { key: "pipeline_coverage", label: "Pipeline Coverage", description: "Pipeline / target bookings.", unit: "x" },
  { key: "magic_number", label: "SaaS Magic Number", description: "New ARR growth / prior quarter S&M expense.", unit: "x" },
];

export const rubrics: Record<RubricPerspective, Rubric> = {
  founder: {
    perspective: "founder",
    requiredDocuments: [
      { name: "Corporate", documents: [
        "Certificate of Incorporation",
        "Articles of Association",
        "Board Resolutions",
        "Shareholder Agreements",
        "Director & Officer Insurance",
        "Option Pool Setup / ESOP Rules",
        "Board Minutes Archive",
      ]},
      { name: "Legal", documents: [
        "Terms of Service",
        "Privacy Policy",
        "Data Processing Agreement",
        "Employment Contracts Template",
        "NDAs (employees, contractors, partners)",
        "Litigation/Dispute Summary",
        "Regulatory Licences",
      ]},
      { name: "Finance", documents: [
        "Audited Financial Statements",
        "Management Accounts",
        "Cash Flow Projections",
        "Tax Returns",
        "Bank Statements",
        "Debt Agreements / Convertible Notes",
        "Cap Table History (share issuances, SAFEs)",
        "Forecast Model (xls/pdf)",
      ]},
      { name: "Product", documents: [
        "Product Roadmap",
        "Technical Architecture",
        "User Analytics Reports",
        "Security Audit Report",
        "Source Code Escrow Agreements",
        "Penetration Test Reports",
        "SLAs / Uptime Reports",
      ]},
      { name: "IP", documents: [
        "Trademark Registrations",
        "Patent Applications",
        "IP Assignment Agreements",
        "Open Source Licences",
        "Background vs Foreground IP Register",
      ]},
      { name: "People", documents: [
        "Employee Handbook",
        "Org Chart",
        "Equity Plan Documents",
        "Key Personnel CVs",
        "Founder/Executive Bios",
        "Employment Policies (leave, benefits)",
      ]},
      { name: "Operations", documents: [
        "Operational Procedures",
        "Vendor Contracts",
        "Insurance Policies (cyber, liability, D&O)",
        "Compliance Certificates",
        "Risk Register",
        "Internal Controls Overview",
      ]},
      { name: "Commercial", documents: [
        "Customer Contracts (top 10 material)",
        "Supplier/Vendor Agreements",
        "Partnership/JV Agreements",
        "Sales Pipeline Report",
        "Churn/Retention Data",
      ]},
      { name: "Strategic", documents: [
        "Pitch Deck",
        "Business Plan / GTM Strategy",
        "Market Research / Competitor Analysis",
        "KPIs / Traction Reports",
        "PR Kit / Press Coverage",
        "Awards & Certifications",
        "ESG / Impact Statements",
      ]},
    ],
    requiredMetrics: CORE_METRICS,
    sections: ["Summary", "Coverage", "Recommendations", "Risks", "Open Questions", "Next Actions"],
    principles: [
      "Diagnose gaps, propose concrete fixes with owners and timelines",
      "Elevate narrative: problem, solution, market size, traction, unit economics",
      "Be concise, executive, bullet-first with strong structure",
    ],
  },
  investor_diligence: {
    perspective: "investor_diligence",
    requiredDocuments: [
      { name: "Finance", documents: [
        "Audited Financial Statements",
        "Management Accounts",
        "Forecast Model (xls/pdf)",
        "Revenue by Product/Segment",
        "Cohort Analysis (logo and dollar)",
        "Pricing & Packaging",
        "Churn/Retention Data",
        "Sales Pipeline & Bookings History",
      ]},
      { name: "Market & Strategy", documents: [
        "Market Sizing (bottom-up)",
        "Competitive Landscape",
        "Differentiation & Moat Analysis",
        "GTM Plan",
      ]},
      { name: "Commercial", documents: [
        "Top 20 Customer Contracts",
        "Customer Concentration Analysis",
        "Partner/Reseller Agreements",
      ]},
      { name: "Product & Tech", documents: [
        "Roadmap & Delivery Plan",
        "Security Audit / Pen Test",
        "Architecture Overview",
        "SOC2/ISO or security policies",
      ]},
      { name: "People & Ops", documents: [
        "Org Chart & Key Hires",
        "ESOP / Options Outstanding",
        "Hiring Plan",
      ]},
    ],
    requiredMetrics: [
      ...CORE_METRICS,
      { key: "cohort_m3_m6_m12", label: "Cohort Retention (3/6/12m)", description: "Logo and dollar retention by cohort at 3/6/12 months.", unit: "%" },
      { key: "top5_concentration", label: "Top 5 Customer Concentration", description: "% of revenue from top 5 customers.", unit: "%" },
      { key: "net_new_arr", label: "Net New ARR", description: "New + expansion - churned ARR.", unit: "$" },
    ],
    sections: ["Summary", "Missing Items", "Findings", "Risks", "Questions", "Valuation Notes", "Next Actions"],
    principles: [
      "Audit completeness, identify red flags and assumptions to test",
      "Be analytical and evidence-backed; call out where evidence is thin",
      "Structure by themes; be concise and decision-oriented",
    ],
  },
  acquirer_mna: {
    perspective: "acquirer_mna",
    requiredDocuments: [
      { name: "Corporate & Legal", documents: [
        "Cap Table History (share issuances, SAFEs)",
        "All Employee/Contractor IP Assignments",
        "Key Contracts with Change of Control Clauses",
        "Litigation/Dispute Summary",
        "Regulatory Licences",
      ]},
      { name: "Commercial", documents: [
        "Top 50 Customer Contracts",
        "Revenue by Customer & Cohorts",
        "Customer Concentration & Churn",
        "Revenue Recognition Policies",
      ]},
      { name: "Technology & Security", documents: [
        "Architecture Overview",
        "Security Policies & Audit Reports (SOC2/ISO)",
        "Penetration Test Reports",
        "Data Map & Privacy Impact Assessments",
        "Open Source Licence Register",
      ]},
      { name: "People & HR", documents: [
        "Org Chart & Compensation Bands",
        "Key Person Dependencies",
        "Benefits & HR Policies",
      ]},
      { name: "Operations", documents: [
        "Vendor List & Contracts",
        "Insurance Policies (cyber, liability, D&O)",
        "Business Continuity & DR Plans",
      ]},
    ],
    requiredMetrics: [
      ...CORE_METRICS,
      { key: "nps", label: "NPS", description: "Net Promoter Score.", unit: "score" },
      { key: "security_incidents_12m", label: "Security Incidents (12m)", description: "Number and severity of incidents in last 12 months.", unit: "count" },
      { key: "revenue_concentration", label: "Revenue Concentration", description: "% revenue from top customers.", unit: "%" },
      { key: "support_sla", label: "Support SLA Adherence", description: "% tickets meeting SLA.", unit: "%" },
    ],
    sections: ["Summary", "Missing Items", "Synergies/Fit", "Risks", "Integration Notes", "Deal Considerations", "Next Actions"],
    principles: [
      "Audit M&A readiness; highlight integration and compliance risks",
      "Assess strategic fit and synergies; estimate integration complexity",
      "Be pragmatic, risk-aware, and action-oriented",
    ],
  },
};

export function getRubric(perspective: RubricPerspective): Rubric {
  return rubrics[perspective];
}

// Helper to flatten required doc names into slug list
export function getRequiredDocSlugs(rubric: Rubric, slugify: (text: string) => string): string[] {
  const slugs = new Set<string>();
  for (const cat of rubric.requiredDocuments) {
    for (const doc of cat.documents) {
      slugs.add(slugify(doc));
    }
  }
  return Array.from(slugs);
}
