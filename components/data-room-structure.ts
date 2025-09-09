export type DataRoomCategory = {
  category: string;
  documents: string[];
};

export const dataRoomStructure: DataRoomCategory[] = [
  {
    category: "Corporate",
    documents: [
      "Certificate of Incorporation",
      "Articles of Association",
      "Board Resolutions",
      "Shareholder Agreements",
      "Director & Officer Insurance",
      "Option Pool Setup / ESOP Rules",
      "Board Minutes Archive",
    ],
  },
  {
    category: "Legal",
    documents: [
      "Terms of Service",
      "Privacy Policy",
      "Data Processing Agreement",
      "Employment Contracts Template",
      "NDAs (employees, contractors, partners)",
      "Litigation/Dispute Summary",
      "Regulatory Licences",
    ],
  },
  {
    category: "Finance",
    documents: [
      "Audited Financial Statements",
      "Management Accounts",
      "Cash Flow Projections",
      "Tax Returns",
      "Bank Statements",
      "Debt Agreements / Convertible Notes",
      "Cap Table History (share issuances, SAFEs)",
      "Forecast Model (xls/pdf)",
    ],
  },
  {
    category: "Product",
    documents: [
      "Product Roadmap",
      "Technical Architecture",
      "User Analytics Reports",
      "Security Audit Report",
      "Source Code Escrow Agreements",
      "Penetration Test Reports",
      "SLAs / Uptime Reports",
    ],
  },
  {
    category: "IP",
    documents: [
      "Trademark Registrations",
      "Patent Applications",
      "IP Assignment Agreements",
      "Open Source Licences",
      "Background vs Foreground IP Register",
    ],
  },
  {
    category: "People",
    documents: [
      "Employee Handbook",
      "Org Chart",
      "Equity Plan Documents",
      "Key Personnel CVs",
      "Founder/Executive Bios",
      "Employment Policies (leave, benefits)",
    ],
  },
  {
    category: "Operations",
    documents: [
      "Operational Procedures",
      "Vendor Contracts",
      "Insurance Policies (cyber, liability, D&O)",
      "Compliance Certificates",
      "Risk Register",
      "Internal Controls Overview",
    ],
  },
  {
    category: "Commercial",
    documents: [
      "Customer Contracts (top 10 material)",
      "Supplier/Vendor Agreements",
      "Partnership/JV Agreements",
      "Sales Pipeline Report",
      "Churn/Retention Data",
    ],
  },
  {
    category: "Strategic",
    documents: [
      "Pitch Deck",
      "Business Plan / GTM Strategy",
      "Market Research / Competitor Analysis",
      "KPIs / Traction Reports",
      "PR Kit / Press Coverage",
      "Awards & Certifications",
      "ESG / Impact Statements",
    ],
  },
];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}


