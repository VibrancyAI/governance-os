import { dataRoomStructure, slugify } from "@/components/data-room-structure";
import { RubricPerspective } from "@/ai/rubrics";

export type ChecklistItem = {
  slug: string;
  title: string;
  category: string;
  perspectiveSpecificRequired: Partial<Record<RubricPerspective, boolean>>;
  acceptanceCriteria: string[];
  expectedEvidence: string[];
};

const OVERRIDES: Record<string, Partial<ChecklistItem>> = {
  [slugify("Audited Financial Statements")]: {
    acceptanceCriteria: [
      "Contains independent auditor report letter",
      "Covers last fiscal year (or most recent)",
      "Includes balance sheet, income statement, cash flows",
    ],
    expectedEvidence: [
      "PDF with auditor letter",
      "Financial statements as-of date",
    ],
    perspectiveSpecificRequired: { founder: true, investor_diligence: true, acquirer_mna: true },
  },
  [slugify("Cap Table History (share issuances, SAFEs)")]: {
    acceptanceCriteria: [
      "Lists all issuances with dates and instruments",
      "Shows fully diluted, options outstanding, SAFEs/convertibles",
    ],
    expectedEvidence: ["Spreadsheet or PDF with transaction log"],
    perspectiveSpecificRequired: { founder: true, investor_diligence: true, acquirer_mna: true },
  },
  [slugify("Churn/Retention Data")]: {
    acceptanceCriteria: [
      "Shows logo and dollar retention",
      "Includes cohort curves (3/6/12m)",
    ],
    expectedEvidence: ["CSV or chart pack with cohorts"],
    perspectiveSpecificRequired: { founder: true, investor_diligence: true, acquirer_mna: true },
  },
  [slugify("Pitch Deck")]: {
    acceptanceCriteria: [
      "Problem, solution, market size (bottom-up)",
      "Traction and unit economics",
      "Team and roadmap",
    ],
    expectedEvidence: ["PDF or slides"],
    perspectiveSpecificRequired: { founder: true, investor_diligence: true },
  },
};

export const CHECKLIST_ITEMS: ChecklistItem[] = (() => {
  const items: ChecklistItem[] = [];
  for (const cat of dataRoomStructure) {
    for (const doc of cat.documents) {
      const slug = slugify(doc);
      const base: ChecklistItem = {
        slug,
        title: doc,
        category: cat.category,
        perspectiveSpecificRequired: { founder: true, investor_diligence: cat.category !== "Product" ? true : false, acquirer_mna: cat.category !== "Strategic" ? true : false },
        acceptanceCriteria: [
          "Document is legible and complete",
          "Matches title and purpose",
        ],
        expectedEvidence: ["File uploaded with clear title", "As-of date visible"],
      };
      const override = OVERRIDES[slug] || {};
      items.push({ ...base, ...override, slug });
    }
  }
  return items;
})();

export function getChecklistBySlug(slug: string): ChecklistItem | undefined {
  return CHECKLIST_ITEMS.find((i) => i.slug === slug);
}

export function listRequiredSlugsForPerspective(p: RubricPerspective): string[] {
  return CHECKLIST_ITEMS.filter((i) => (i.perspectiveSpecificRequired[p] ?? false)).map((i) => i.slug);
}
