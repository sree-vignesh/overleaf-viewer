import { NextResponse } from "next/server";
import axios from "axios";
import NodeCache from "node-cache";

// ---------------------------
// Cache
// ---------------------------
const cache = new NodeCache({ stdTTL: 1200 });

// ---------------------------
// Helper Functions
// ---------------------------
const defaultHeader = () => ({
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64; rv:114.0) Gecko/20100101 Firefox/114.0",
  Origin: "https://www.overleaf.com",
});

const getCSRF = (html) => {
  const match = html.match(/<meta name="ol-csrfToken" content="(.*?)">/);
  return match?.[1] || null;
};

const getProjectTitle = (html) => {
  const match = html.match(/<meta name="og:title" content="(.*?)">/);
  return match?.[1] || "Untitled";
};

const getCookieString = (cookies = []) =>
  cookies.map((c) => c.split(";")[0]).join(";");

const errorHandler = (msg, status = 500) => {
  console.error("Error:", msg);
  const err = new Error(msg);
  err.status = status;
  throw err;
};

// ---------------------------
// Overleaf Steps
// ---------------------------
async function readPage(token) {
  console.log(`[STEP] Reading Overleaf page for token: ${token}`);
  const res = await axios.get(`https://www.overleaf.com/read/${token}`, {
    headers: defaultHeader(),
    validateStatus: () => true,
  });

  console.log(`[STEP] Read page status: ${res.status}`);
  if (res.status !== 200) errorHandler("Read page failed", res.status);

  const csrf = getCSRF(res.data);
  if (!csrf) errorHandler("CSRF token not found on read page");

  const cookie = getCookieString(res.headers["set-cookie"] || []);
  const referer = res.request.res.responseUrl;

  console.log(`[INFO] CSRF: ${csrf}, Cookie length: ${cookie.length}`);
  return { csrf, cookie, referer };
}

async function grantAccess(token, csrf, cookie, referer) {
  console.log(`[STEP] Granting access for token: ${token}`);
  const res = await axios.post(
    `https://www.overleaf.com/read/${token}/grant`,
    { _csrf: csrf },
    {
      headers: { ...defaultHeader(), Cookie: cookie, Referer: referer },
      validateStatus: () => true,
    }
  );

  console.log(`[STEP] Grant response:`, res.data);
  if (!res.data?.redirect) errorHandler("Grant failed", res.status);

  const projectId = res.data.redirect.replace("/project/", "");
  const grantCookie = getCookieString(res.headers["set-cookie"] || []);
  console.log(`[INFO] Project ID: ${projectId}`);
  return { projectId, cookie: grantCookie || cookie };
}

async function compileProject(projectId, csrf, cookie) {
  console.log(`[STEP] Compiling project ID: ${projectId}`);
  const projectReferer = `https://www.overleaf.com/project/${projectId}`;

  const res = await axios.post(
    `https://www.overleaf.com/project/${projectId}/compile?auto_compile=true`,
    { _csrf: csrf, rootDoc_id: null, draft: false, check: "silent" },
    {
      headers: {
        "Content-Type": "application/json",
        Referer: projectReferer,
        Cookie: cookie,
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64)",
        Accept: "application/json",
      },
      validateStatus: () => true,
    }
  );

  console.log(`[STEP] Compile response status: ${res.status}`);
  if (!res.data?.outputFiles)
    errorHandler("Compilation failed or incomplete", res.status);

  const pdfFile = res.data.outputFiles.find((f) => f.type === "pdf");
  if (!pdfFile) errorHandler("PDF file not found in output files");

  const pdfUrl = `${res.data.pdfDownloadDomain}${pdfFile.url}`;
  console.log(`[INFO] PDF URL: ${pdfUrl}`);
  return { pdfUrl, cookie };
}

async function downloadPDF(pdfUrl, cookie) {
  console.log(`[STEP] Downloading PDF from: ${pdfUrl}`);
  const res = await axios.get(pdfUrl, {
    responseType: "arraybuffer",
    headers: { Cookie: cookie },
    validateStatus: () => true,
  });

  console.log(`[STEP] PDF download status: ${res.status}`);
  if (res.status !== 200) errorHandler("PDF download failed", res.status);

  return Buffer.from(res.data);
}

// ---------------------------
// API Route
// ---------------------------
export async function GET(req, { params: paramsPromise }) {
  try {
    const params = await paramsPromise; // ⚡ Must await in Next.js 14+
    const { token } = params;

    console.log(`[API] Received token: ${token}`);
    if (!/^[a-z0-9]{12}$/.test(token)) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Serve cached PDF if available
    if (cache.get(token)) {
      console.log(`[CACHE] Returning cached PDF for token: ${token}`);
      return new Response(cache.get(token), {
        headers: { "Content-Type": "application/pdf" },
      });
    }

    const { csrf, cookie: readCookie, referer } = await readPage(token);
    const { projectId, cookie } = await grantAccess(
      token,
      csrf,
      readCookie,
      referer
    );
    const { pdfUrl, cookie: updatedCookie } = await compileProject(
      projectId,
      csrf,
      cookie
    );
    const pdfBuffer = await downloadPDF(pdfUrl, updatedCookie);

    cache.set(token, pdfBuffer);

    console.log(`[SUCCESS] PDF generated and cached for token: ${token}`);
    return new Response(pdfBuffer, {
      headers: { "Content-Type": "application/pdf" },
    });
  } catch (e) {
    console.error("[ERROR]", e);
    return NextResponse.json(
      { error: e.message || "Unknown error" },
      { status: e.status || 500 }
    );
  }
}
