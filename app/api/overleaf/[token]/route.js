import { NextResponse } from "next/server";
import axios from "axios";
import NodeCache from "node-cache";

// ---------------------------
// Simple in-memory cache
// ---------------------------
const cache = new NodeCache({ stdTTL: 600 }); // 10 min TTL

// ---------------------------
// Cache keys helpers
// ---------------------------
const projectIdKey = (token) => `projectId-${token}`;
const csrfKey = (token) => `csrf-${token}`;
const cookieKey = (token) => `cookie-${token}`;
const refererKey = (token) => `referer-${token}`;
const titleKey = (token) => `title-${token}`;

// ---------------------------
// Helpers
// ---------------------------
const base = "https://www.overleaf.com";

const defaultHeader = () => ({
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64; rv:114.0) Gecko/20100101 Firefox/114.0",
  Origin: base,
});

const getCookieString = (cookies = []) =>
  cookies.map((c) => c.split(";")[0]).join(";");

const extractCSRF = (html) =>
  html.match(/<meta name="ol-csrfToken" content="(.*?)">/)?.[1];

const getProjectTitle = (html) =>
  html.match(/<meta name="og:title" content="(.*?)">/)?.[1];

const errorHandler = (msg, status = 500) => {
  const err = new Error(msg);
  err.status = status;
  throw err;
};

// ---------------------------
// Overleaf Steps
// ---------------------------

async function readPage(token) {
  console.log("[STEP] Reading Overleaf page...");
  const res = await axios.get(`${base}/read/${token}`, {
    headers: defaultHeader(),
    validateStatus: () => true,
  });

  if (res.status !== 200) errorHandler("Read page failed", res.status);

  const csrf = extractCSRF(res.data);
  const cookie = getCookieString(res.headers["set-cookie"] || []);
  const referer = res.request.res.responseUrl;

  cache.set(csrfKey(token), csrf);
  cache.set(cookieKey(token), cookie);
  cache.set(refererKey(token), referer);

  console.log("[INFO] CSRF, Cookie, Referer stored in cache");
}

async function grantAccess(token) {
  console.log("[STEP] Granting access...");
  const csrf = cache.get(csrfKey(token));
  const cookie = cache.get(cookieKey(token));
  const referer = cache.get(refererKey(token));

  const res = await axios.post(
    `${base}/read/${token}/grant`,
    { _csrf: csrf },
    {
      headers: { ...defaultHeader(), Cookie: cookie, Referer: referer },
      validateStatus: () => true,
    }
  );

  if (!res.data?.redirect) errorHandler("Grant failed", res.status);

  const projectId = res.data.redirect.replace("/project/", "");
  const grantCookie = getCookieString(res.headers["set-cookie"] || []);
  cache.set(cookieKey(token), grantCookie || cookie);
  cache.set(projectIdKey(token), projectId);

  console.log("[INFO] Access granted, projectId stored:", projectId);
}

async function loadProject(token) {
  console.log("[STEP] Loading project page...");
  const projectId = cache.get(projectIdKey(token));
  const cookie = cache.get(cookieKey(token));

  const res = await axios.get(`${base}/project/${projectId}`, {
    headers: { ...defaultHeader(), Cookie: cookie },
    validateStatus: () => true,
  });

  if (res.status !== 200) errorHandler("Project load failed", res.status);

  const title = getProjectTitle(res.data);
  if (title) cache.set(titleKey(token), title);

  console.log("[INFO] Project title stored:", title);
}

async function compileProject(token) {
  console.log("[STEP] Compiling project...");
  const projectId = cache.get(projectIdKey(token));
  const csrf = cache.get(csrfKey(token));
  const cookie = cache.get(cookieKey(token));

  const res = await axios.post(
    `${base}/project/${projectId}/compile`,
    {
      rootDoc: "main.tex",
      draft: false,
      check: "silent",
      incrementalCompilesEnabled: false,
    },
    {
      headers: {
        ...defaultHeader(),
        Cookie: cookie,
        Referer: `${base}/project/${projectId}`,
        "x-csrf-token": csrf,
        "x-requested-with": "XMLHttpRequest",
        Accept: "application/json",
      },
      validateStatus: () => true,
    }
  );

  if (!res.data?.outputFiles) errorHandler("Compilation failed", res.status);

  console.log("[INFO] Compilation output received");
  return res.data;
}

function buildPDFLink(compileData) {
  console.log("[STEP] Building PDF download link...");
  const pdfFile = compileData.outputFiles.find((f) => f.type === "pdf");
  if (!pdfFile) errorHandler("PDF file not found after compile");

  const pdfLink = `${compileData.pdfDownloadDomain}${pdfFile.url}?compileGroup=${compileData.compileGroup}&clsiserverid=${compileData.clsiServerId}&enable_pdf_caching=true`;

  console.log("[INFO] PDF link built:", pdfLink);
  return pdfLink;
}

// ---------------------------
// API Route
// ---------------------------
export async function GET(req, context) {
  try {
    // ----- UNWRAP params (Next.js 14+) -----
    const params = await context.params;
    const token = params.token;

    console.log("[INFO] Token received:", token);

    if (!/^[a-z]{12}$/.test(token)) {
      console.warn("[WARN] Invalid token format");
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // ----- CACHE CHECK -----
    if (cache.get(token)) {
      console.log("[CACHE] Returning cached PDF URL");
      return NextResponse.json({ pdf: cache.get(token) });
    }

    // ----- STEPS -----
    await readPage(token);
    await grantAccess(token);
    await loadProject(token);
    const compileData = await compileProject(token);
    const pdfLink = buildPDFLink(compileData);

    // ----- CACHE FINAL PDF URL -----
    cache.set(token, pdfLink);

    console.log("[SUCCESS] PDF link ready");
    return NextResponse.json({ pdf: pdfLink });
  } catch (e) {
    console.error("[ERROR]", e.message, e.status || "");
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
