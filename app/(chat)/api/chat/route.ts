import { customModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { createMessage } from "@/app/db";
import { streamText } from "ai";

export async function POST(request: Request) {
  const { id, messages, selectedFilePathnames, perspective } = await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const perspectiveSystem = (() => {
    switch (perspective) {
      case "founder_raising":
        return `You are an AI operating as a startup founder preparing an investor-ready data room.
Objectives:
- Identify missing or weak artifacts and propose concrete additions (templates/checklists acceptable)
- Elevate narrative: problem, solution, market (bottom-up), traction, unit economics, retention, milestones
- Clarify risks and mitigations, GTM, hiring plan, roadmap, capital plan and use of proceeds
Output style:
- Executive, concise, bullet-first. Sections: Summary, Gaps/Missing, Recommendations, Risks, Open Questions.`;
      case "investor_diligence":
        return `You are an investor performing venture due diligence.
Objectives:
- Audit the data room for completeness; list missing materials and diligence gaps
- Analyze market, competition, differentiation, moat, traction, unit economics, cohorts/retention, sales efficiency
- Surface red flags, key assumptions to test, and questions for founders; note valuation considerations
Output style:
- Analytical, evidence-backed bullets. Sections: Summary, Missing Items, Findings, Risks, Questions.`;
      case "acquirer_mna":
        return `You are a corporate development lead evaluating an acquisition.
Objectives:
- Audit readiness: list missing/weak M&A materials (contracts, IP, compliance, HR, security, financials)
- Assess strategic fit/synergies, integration risks, revenue quality, churn, key customer concentration
- Suggest deal structure considerations and integration priorities
Output style:
- Pragmatic, risk-aware bullets. Sections: Summary, Missing Items, Synergies/Fit, Risks, Integration Notes.`;
      default:
        return `You are a helpful assistant for data room analysis.`;
    }
  })();

  const result = streamText({
    model: customModel,
    system: perspectiveSystem,
    messages,
    temperature: 1,
    toolChoice: "none",
    experimental_providerMetadata: {
      files: {
        selection: selectedFilePathnames,
        // expose missing items to middleware-aware models
        metadata: {
          missing: selectedFilePathnames.length === 0 ? "all" : "partial",
        },
      },
    },
    onFinish: async ({ text }) => {
      await createMessage({
        id,
        messages: [...messages, { role: "assistant", content: text }],
        author: session.user?.email!,
      });
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}
