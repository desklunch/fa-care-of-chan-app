import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { typeformWebhookStorage } from "./typeform-webhook.storage";

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
}

interface TypeformAnswer {
  type: string;
  field: {
    id: string;
    ref: string;
    type: string;
    title?: string;
  };
  text?: string;
  email?: string;
  phone_number?: string;
  number?: number;
  boolean?: boolean;
  choice?: { label: string };
  choices?: { labels: string[] };
  date?: string;
}

interface TypeformDefinitionField {
  id: string;
  ref: string;
  type: string;
  title: string;
}

interface TypeformPayload {
  event_id: string;
  event_type: string;
  form_response: {
    form_id: string;
    token: string;
    submitted_at: string;
    definition?: {
      fields?: TypeformDefinitionField[];
    };
    answers: TypeformAnswer[];
  };
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeEventDate(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const mdy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return trimmed;
}

function buildAnswerTitleMap(
  answers: TypeformAnswer[],
  definitionFields: TypeformDefinitionField[] | undefined
): Map<TypeformAnswer, string> {
  const idToTitle = new Map<string, string>();
  const refToTitle = new Map<string, string>();
  for (const f of definitionFields || []) {
    if (f.id && f.title) idToTitle.set(f.id, f.title);
    if (f.ref && f.title) refToTitle.set(f.ref, f.title);
  }
  const map = new Map<TypeformAnswer, string>();
  for (const a of answers) {
    const title =
      a.field?.title ||
      (a.field?.id ? idToTitle.get(a.field.id) : undefined) ||
      (a.field?.ref ? refToTitle.get(a.field.ref) : undefined) ||
      "";
    map.set(a, title);
  }
  return map;
}

function getAnswerValue(answer: TypeformAnswer): string {
  switch (answer.type) {
    case "text":
    case "long_text":
      return answer.text || "";
    case "email":
      return answer.email || "";
    case "phone_number":
      return answer.phone_number || "";
    case "number":
      return answer.number?.toString() || "";
    case "boolean":
      return answer.boolean ? "Yes" : "No";
    case "choice":
      return answer.choice?.label || "";
    case "choices":
      return answer.choices?.labels?.join(", ") || "";
    case "date":
      return answer.date || "";
    default:
      return answer.text || "";
  }
}

function getAnswerByTitle(
  answers: TypeformAnswer[],
  title: string,
  titleMap: Map<TypeformAnswer, string>
): string {
  const target = normalizeTitle(title);
  const answer = answers.find(
    (a) => normalizeTitle(titleMap.get(a) || "") === target
  );
  return answer ? getAnswerValue(answer) : "";
}

function getAllAnswersByTitle(
  answers: TypeformAnswer[],
  title: string,
  titleMap: Map<TypeformAnswer, string>
): string[] {
  const target = normalizeTitle(title);
  return answers
    .filter((a) => normalizeTitle(titleMap.get(a) || "") === target)
    .map(getAnswerValue)
    .filter(Boolean);
}

function verifySignature(payload: Buffer, signature: string, secret: string): boolean {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64");
  const expected = `sha256=${hash}`;
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function registerTypeformWebhookRoutes(app: Express) {
  app.post("/api/webhooks/typeform", async (req: RequestWithRawBody, res: Response) => {
    try {
      const secret = process.env.TYPEFORM_WEBHOOK_SECRET;
      if (!secret) {
        console.error("TYPEFORM_WEBHOOK_SECRET is not configured");
        return res.status(500).json({ message: "Webhook secret not configured" });
      }

      const signature = req.headers["typeform-signature"] as string;
      if (!signature) {
        return res.status(401).json({ message: "Missing signature" });
      }

      const rawBody = req.rawBody;
      if (!rawBody || !verifySignature(rawBody, signature, secret)) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      const payload: TypeformPayload = req.body;

      if (!payload.form_response) {
        return res.status(400).json({ message: "Invalid payload: missing form_response" });
      }

      const { token, submitted_at, answers, definition } = payload.form_response;

      const existingDeal = await typeformWebhookStorage.findDealByExternalId(token);
      if (existingDeal) {
        return res.status(200).json({ message: "Duplicate submission", dealId: existingDeal.id });
      }

      const titleMap = buildAnswerTitleMap(answers, definition?.fields);
      const get = (title: string) => getAnswerByTitle(answers, title, titleMap);
      const getAll = (title: string) => getAllAnswersByTitle(answers, title, titleMap);

      const firstName = get("First name");
      const lastName = get("Last name");
      const email = get("Email");
      const phone = get("Phone number");
      const jobTitle = getAll("What is your job title?").find(Boolean) || "";
      const companyName = get("Company");

      const eventFunction = get("What is the function of your event?");
      const budgetRange = get("What is your all-in event budget range?");
      const budgetExact = get("What is your all-in event budget?");
      const budgetConfirm = get(
        "Please note that our event budget minimum is $75K (inclusive of agency fees). With that, can you confirm your all-in budget cap and share if your budget is flexible?"
      );
      const eventDateRaw = get("What is the date of your event?");
      const eventDate = normalizeEventDate(eventDateRaw);
      const eventLocation = get("What is the location of your event?") ||
        getAll("What is the location of your event?").join("; ");
      const guestCount = get("What is your target guest count?") ||
        getAll("What is your target guest count?").join("; ");
      const eventFormat = get("What is the format of your event?") ||
        getAll("What is the format of your event?").join("; ");
      const dateFlexible = get("Is your event date flexible at all?");
      const backupDates = get("What are your back up dates?");
      const eventHost = get("Who is the event host or guest of honor?");
      const primaryService = get(
        "What primary service are you looking for in an agency partner?"
      );

      const conceptParts = [
        ...getAll("Please tell us more about your brand."),
        ...getAll("Please tell us more about your company."),
        ...getAll("Please tell us more about your event concept."),
        ...getAll("Please tell us more about what you're brand has got going on and how we can support."),
        get("Please comment with any additional information that you'd like us to know about your event."),
        get("Please comment with any additional information that you'd like us to know."),
      ].filter(Boolean);
      const concept = conceptParts.join("\n\n");

      const notesParts: string[] = [];
      if (guestCount) notesParts.push(`Target guest count: ${guestCount}`);
      if (eventFunction) notesParts.push(`Event function: ${eventFunction}`);
      if (eventFormat) notesParts.push(`Event format: ${eventFormat}`);
      if (dateFlexible) notesParts.push(`Date flexible: ${dateFlexible}`);
      if (backupDates) notesParts.push(`Backup dates: ${backupDates}`);
      if (eventHost) notesParts.push(`Event host / guest of honor: ${eventHost}`);
      if (primaryService) notesParts.push(`Primary service: ${primaryService}`);
      const notes = notesParts.join("\n");

      const budgetParts: string[] = [];
      if (budgetRange) budgetParts.push(budgetRange);
      if (budgetExact) budgetParts.push(budgetExact);
      if (budgetConfirm) budgetParts.push(budgetConfirm);
      const budgetNotes = budgetParts.join("\n");

      let contact = email
        ? await typeformWebhookStorage.findContactByEmail(email)
        : undefined;

      if (!contact && (firstName || lastName || email)) {
        contact = await typeformWebhookStorage.createContact({
          firstName: firstName || "(Unknown)",
          lastName: lastName || "(Unknown)",
          emailAddresses: email ? [email] : [],
          phoneNumbers: phone ? [phone] : [],
          jobTitle: jobTitle || null,
        });
      }

      const emailDomain = email ? email.split("@")[1] : "";

      let client: { id: string; name: string } | undefined;
      if (companyName) {
        client = await typeformWebhookStorage.findClientByName(companyName);
      }
      if (!client && emailDomain) {
        client = await typeformWebhookStorage.findClientByEmailDomain(emailDomain);
      }
      if (!client && companyName) {
        client = await typeformWebhookStorage.createClient({ name: companyName });
      }
      if (!client) {
        const DEFAULT_CLIENT_ID = "12e82994-9c2a-474c-bb50-328e7808f6d4";
        const defaultClient = await typeformWebhookStorage.findClientById(DEFAULT_CLIENT_ID);
        if (defaultClient) {
          client = defaultClient;
        } else {
          throw new Error(`Default client ${DEFAULT_CLIENT_ID} not found`);
        }
      }

      if (contact) {
        await typeformWebhookStorage.linkContactToClient(client.id, contact.id);
      }

      const defaultStatus = await typeformWebhookStorage.getDefaultDealStatus();
      if (!defaultStatus) {
        console.error("No default deal status found");
        return res.status(500).json({ message: "No default deal status configured" });
      }

      const owner = await typeformWebhookStorage.findUserByName("Susana", "Yepes");
      if (!owner) {
        console.error("Typeform webhook: owner user 'Susana Yepes' not found in users table");
        return res.status(500).json({ message: "Deal owner 'Susana Yepes' not found. Please ensure this user exists." });
      }

      const displayName = companyName && eventFunction
        ? `${companyName} – ${eventFunction}`
        : companyName || `${firstName} ${lastName}`.trim() || "Typeform Inquiry";

      const startedOn = submitted_at ? submitted_at.split("T")[0] : null;

      const missingRequired: string[] = [];
      if (!companyName) missingRequired.push("company");
      if (!email) missingRequired.push("email");
      if (!eventDate) missingRequired.push("event_date");
      if (missingRequired.length > 0) {
        console.warn(
          `Typeform webhook: token=${token} form_id=${payload.form_response.form_id} missing fields after mapping: ${missingRequired.join(", ")}`
        );
      }

      const deal = await typeformWebhookStorage.createDeal({
        externalId: token,
        displayName,
        status: defaultStatus.id,
        clientId: client.id,
        primaryContactId: contact?.id || null,
        ownerId: owner?.id || null,
        budgetNotes: budgetNotes || null,
        projectDate: eventDate || null,
        locationsText: eventLocation || null,
        concept: concept || null,
        notes: notes || null,
        startedOn,
        locations: [],
        eventSchedule: [],
        serviceIds: [],
      });

      console.log(`Typeform webhook: created deal ${deal.id} (${displayName}) from token ${token}`);

      return res.status(201).json({
        message: "Deal created",
        dealId: deal.id,
        contactId: contact?.id,
        clientId: client.id,
      });
    } catch (error) {
      const dbError = error as DatabaseError;
      if (dbError.code === "23505" && String(dbError.constraint || dbError.detail || "").includes("external_id")) {
        const formToken = req.body?.form_response?.token as string | undefined;
        if (formToken) {
          const existing = await typeformWebhookStorage.findDealByExternalId(formToken);
          if (existing) {
            return res.status(200).json({ message: "Duplicate submission", dealId: existing.id });
          }
        }
        return res.status(200).json({ message: "Duplicate submission" });
      }
      console.error("Typeform webhook error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}
