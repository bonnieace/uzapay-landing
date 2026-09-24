const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP = 10;
const hits = new Map();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return json({ message: "Method not allowed." }, 405);
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);

  if (!apiKey || !Number.isInteger(listId) || listId <= 0) {
    console.error("Missing BREVO_API_KEY or invalid BREVO_LIST_ID.");
    return json({ message: "Waitlist is not configured yet." }, 500);
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const host = new URL(origin).host;
      const allowed =
        host === "uzapay.co.ke" ||
        host === "www.uzapay.co.ke" ||
        host.endsWith(".netlify.app") ||
        host.startsWith("localhost:");
      if (!allowed) return json({ message: "Invalid request origin." }, 403);
    } catch {
      return json({ message: "Invalid request origin." }, 403);
    }
  }

  const ip = context.ip || "unknown";
  const now = Date.now();
  const previous = hits.get(ip) || [];
  const recent = previous.filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_PER_IP) {
    return json({ message: "Too many attempts. Please try again later." }, 429);
  }
  recent.push(now);
  hits.set(ip, recent);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ message: "Invalid request." }, 400);
  }

  const email = cleanEmail(payload?.email);
  if (!validEmail(email)) {
    return json({ message: "Enter a valid email address." }, 400);
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Brevo contact error:", response.status, detail);
      return json(
        { message: "We couldn't add you right now. Please try again." },
        response.status === 429 ? 429 : 502
      );
    }

    return json({ ok: true }, 200);
  } catch (error) {
    console.error("Brevo request failed:", error);
    return json({ message: "We couldn't add you right now. Please try again." }, 502);
  }
};

export const config = { path: "/.netlify/functions/waitlist" };
