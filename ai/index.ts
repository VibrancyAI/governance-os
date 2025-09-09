import { openai } from "@ai-sdk/openai";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";
import { ragMiddleware } from "./rag-middleware";

const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-5";

export const customModel = wrapLanguageModel({
  model: openai(TEXT_MODEL),
  middleware: ragMiddleware,
});
