import { getPdfContentFromUrl } from "@/utils/pdf";
import { htmlToText } from "html-to-text";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";

async function fetchAsText(url: string): Promise<string> {
  const response = await fetch(url);
  return await response.text();
}

async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  return await response.arrayBuffer();
}

async function fetchAsBuffer(url: string): Promise<Buffer> {
  const arrayBuffer = await fetchAsArrayBuffer(url);
  return Buffer.from(arrayBuffer);
}

async function getDocxContentFromUrl(url: string): Promise<string> {
  const arrayBuffer = await fetchAsArrayBuffer(url);
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

async function getHtmlContentFromUrl(url: string): Promise<string> {
  const html = await fetchAsText(url);
  return htmlToText(html, { wordwrap: false });
}

async function getCsvContentFromUrl(url: string): Promise<string> {
  // For RAG, plain text is acceptable; parsing to tables is optional.
  const text = await fetchAsText(url);
  return text;
}

async function getJsonContentFromUrl(url: string): Promise<string> {
  const text = await fetchAsText(url);
  try {
    const obj = JSON.parse(text);
    return JSON.stringify(obj, null, 2);
  } catch {
    return text; // fallback if not valid JSON
  }
}

async function getMarkdownOrTextFromUrl(url: string): Promise<string> {
  return await fetchAsText(url);
}

async function getImageOcrTextFromUrl(url: string): Promise<string> {
  const buffer = await fetchAsBuffer(url);
  const result = await Tesseract.recognize(buffer, "eng");
  return result.data?.text || "";
}

export async function extractTextFromUrl(
  filename: string,
  url: string,
): Promise<string> {
  const lower = (filename || "").toLowerCase();
  if (lower.endsWith(".pdf")) {
    return getPdfContentFromUrl(url);
  }
  if (lower.endsWith(".docx")) {
    return getDocxContentFromUrl(url);
  }
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return getHtmlContentFromUrl(url);
  }
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return getMarkdownOrTextFromUrl(url);
  }
  if (lower.endsWith(".txt")) {
    return getMarkdownOrTextFromUrl(url);
  }
  if (lower.endsWith(".csv")) {
    return getCsvContentFromUrl(url);
  }
  if (lower.endsWith(".json")) {
    return getJsonContentFromUrl(url);
  }
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".tif") ||
    lower.endsWith(".tiff") ||
    lower.endsWith(".bmp")
  ) {
    return getImageOcrTextFromUrl(url);
  }

  // Default: attempt plain text
  return getMarkdownOrTextFromUrl(url);
}


