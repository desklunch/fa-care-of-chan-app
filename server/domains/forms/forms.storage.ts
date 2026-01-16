import { db } from "../../db";
import { eq, desc, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  formTemplates,
  formRequests,
  outreachTokens,
  formResponses,
  vendors,
  contacts,
  users,
  type FormTemplate,
  type FormTemplateWithRelations,
  type CreateFormTemplate,
  type UpdateFormTemplate,
  type FormRequest,
  type FormRequestWithRelations,
  type CreateFormRequest,
  type UpdateFormRequest,
  type OutreachToken,
  type OutreachTokenWithRecipient,
  type FormResponse,
  type CreateFormResponse,
  type PublicFormData,
  type FormSection,
  type RecipientType,
} from "@shared/schema";

class FormsStorage {
  // ===== FORM TEMPLATES =====

  async getFormTemplates(): Promise<FormTemplateWithRelations[]> {
    const templates = await db
      .select({
        id: formTemplates.id,
        name: formTemplates.name,
        description: formTemplates.description,
        formSchema: formTemplates.formSchema,
        createdById: formTemplates.createdById,
        createdAt: formTemplates.createdAt,
        updatedAt: formTemplates.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(formTemplates)
      .leftJoin(users, eq(formTemplates.createdById, users.id))
      .orderBy(desc(formTemplates.createdAt));

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      formSchema: t.formSchema as FormSection[],
      createdById: t.createdById,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      createdBy: t.createdById
        ? {
            id: t.createdById,
            firstName: t.createdByFirstName,
            lastName: t.createdByLastName,
          }
        : null,
    }));
  }

  async getFormTemplateById(id: string): Promise<FormTemplateWithRelations | undefined> {
    const templates = await db
      .select({
        id: formTemplates.id,
        name: formTemplates.name,
        description: formTemplates.description,
        formSchema: formTemplates.formSchema,
        createdById: formTemplates.createdById,
        createdAt: formTemplates.createdAt,
        updatedAt: formTemplates.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(formTemplates)
      .leftJoin(users, eq(formTemplates.createdById, users.id))
      .where(eq(formTemplates.id, id));

    if (templates.length === 0) return undefined;

    const t = templates[0];
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      formSchema: t.formSchema as FormSection[],
      createdById: t.createdById,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      createdBy: t.createdById
        ? {
            id: t.createdById,
            firstName: t.createdByFirstName,
            lastName: t.createdByLastName,
          }
        : null,
    };
  }

  async createFormTemplate(data: CreateFormTemplate, createdById: string): Promise<FormTemplate> {
    const [template] = await db
      .insert(formTemplates)
      .values({
        ...data,
        createdById,
      })
      .returning();
    return template;
  }

  async updateFormTemplate(id: string, data: UpdateFormTemplate): Promise<FormTemplate | undefined> {
    const [template] = await db
      .update(formTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(formTemplates.id, id))
      .returning();
    return template;
  }

  async deleteFormTemplate(id: string): Promise<void> {
    await db.delete(formTemplates).where(eq(formTemplates.id, id));
  }

  // ===== FORM REQUESTS =====

  async getFormRequests(): Promise<FormRequestWithRelations[]> {
    const requests = await db
      .select({
        id: formRequests.id,
        templateId: formRequests.templateId,
        title: formRequests.title,
        description: formRequests.description,
        formSchema: formRequests.formSchema,
        status: formRequests.status,
        dueDate: formRequests.dueDate,
        sentAt: formRequests.sentAt,
        createdById: formRequests.createdById,
        createdAt: formRequests.createdAt,
        updatedAt: formRequests.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(formRequests)
      .leftJoin(users, eq(formRequests.createdById, users.id))
      .orderBy(desc(formRequests.createdAt));

    const requestIds = requests.map((r) => r.id);
    const tokenCounts: Record<string, { total: number; responded: number }> = {};

    if (requestIds.length > 0) {
      const tokens = await db
        .select({
          requestId: outreachTokens.requestId,
          status: outreachTokens.status,
        })
        .from(outreachTokens)
        .where(inArray(outreachTokens.requestId, requestIds));

      tokens.forEach((t) => {
        if (!tokenCounts[t.requestId]) {
          tokenCounts[t.requestId] = { total: 0, responded: 0 };
        }
        tokenCounts[t.requestId].total++;
        if (t.status === "responded") {
          tokenCounts[t.requestId].responded++;
        }
      });
    }

    return requests.map((r) => ({
      id: r.id,
      templateId: r.templateId,
      title: r.title,
      description: r.description,
      formSchema: r.formSchema as FormSection[],
      status: r.status,
      dueDate: r.dueDate,
      sentAt: r.sentAt,
      createdById: r.createdById,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      createdBy: r.createdById
        ? {
            id: r.createdById,
            firstName: r.createdByFirstName,
            lastName: r.createdByLastName,
          }
        : null,
      recipientCount: tokenCounts[r.id]?.total || 0,
      respondedCount: tokenCounts[r.id]?.responded || 0,
    }));
  }

  async getFormRequestById(id: string): Promise<FormRequestWithRelations | undefined> {
    const requests = await db
      .select({
        id: formRequests.id,
        templateId: formRequests.templateId,
        title: formRequests.title,
        description: formRequests.description,
        formSchema: formRequests.formSchema,
        status: formRequests.status,
        dueDate: formRequests.dueDate,
        sentAt: formRequests.sentAt,
        createdById: formRequests.createdById,
        createdAt: formRequests.createdAt,
        updatedAt: formRequests.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(formRequests)
      .leftJoin(users, eq(formRequests.createdById, users.id))
      .where(eq(formRequests.id, id));

    if (requests.length === 0) return undefined;

    const r = requests[0];
    const tokens = await this.getOutreachTokensByRequestId(id);

    return {
      id: r.id,
      templateId: r.templateId,
      title: r.title,
      description: r.description,
      formSchema: r.formSchema as FormSection[],
      status: r.status,
      dueDate: r.dueDate,
      sentAt: r.sentAt,
      createdById: r.createdById,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      createdBy: r.createdById
        ? {
            id: r.createdById,
            firstName: r.createdByFirstName,
            lastName: r.createdByLastName,
          }
        : null,
      tokens,
      recipientCount: tokens.length,
      respondedCount: tokens.filter((t) => t.status === "responded").length,
    };
  }

  async createFormRequest(data: CreateFormRequest, createdById: string): Promise<FormRequest> {
    const [request] = await db
      .insert(formRequests)
      .values({
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById,
      })
      .returning();
    return request;
  }

  async updateFormRequest(id: string, data: UpdateFormRequest): Promise<FormRequest | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.formSchema !== undefined) updateData.formSchema = data.formSchema;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate as unknown as string) : null;
    }
    const [request] = await db
      .update(formRequests)
      .set(updateData)
      .where(eq(formRequests.id, id))
      .returning();
    return request;
  }

  async deleteFormRequest(id: string): Promise<void> {
    await db.delete(formRequests).where(eq(formRequests.id, id));
  }

  // ===== OUTREACH TOKENS =====

  async createOutreachTokens(
    requestId: string,
    recipients: Array<{ type: RecipientType; id: string }>,
    expiresInDays: number = 30
  ): Promise<OutreachToken[]> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const tokensToInsert = recipients.map((r) => ({
      requestId,
      recipientType: r.type,
      recipientId: r.id,
      token: randomBytes(32).toString("hex"),
      expiresAt,
    }));

    const createdTokens = await db
      .insert(outreachTokens)
      .values(tokensToInsert)
      .returning();

    return createdTokens;
  }

  async getOutreachTokensByRequestId(requestId: string): Promise<OutreachTokenWithRecipient[]> {
    const tokens = await db
      .select()
      .from(outreachTokens)
      .where(eq(outreachTokens.requestId, requestId))
      .orderBy(desc(outreachTokens.createdAt));

    const result: OutreachTokenWithRecipient[] = [];

    for (const token of tokens) {
      let vendor = null;
      let contact = null;
      let response = null;

      if (token.recipientType === "vendor") {
        const [v] = await db
          .select()
          .from(vendors)
          .where(eq(vendors.id, token.recipientId));
        vendor = v || null;
      } else if (token.recipientType === "contact") {
        const [c] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, token.recipientId));
        contact = c || null;
      }

      const [r] = await db
        .select()
        .from(formResponses)
        .where(eq(formResponses.tokenId, token.id));
      response = r || null;

      result.push({
        ...token,
        vendor,
        contact,
        response,
      });
    }

    return result;
  }

  async getOutreachTokenByToken(token: string): Promise<OutreachTokenWithRecipient | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(outreachTokens)
      .where(eq(outreachTokens.token, token));

    if (!tokenRecord) return undefined;

    let vendor = null;
    let contact = null;
    let response = null;

    if (tokenRecord.recipientType === "vendor") {
      const [v] = await db
        .select()
        .from(vendors)
        .where(eq(vendors.id, tokenRecord.recipientId));
      vendor = v || null;
    } else if (tokenRecord.recipientType === "contact") {
      const [c] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, tokenRecord.recipientId));
      contact = c || null;
    }

    const [r] = await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.tokenId, tokenRecord.id));
    response = r || null;

    return {
      ...tokenRecord,
      vendor,
      contact,
      response,
    };
  }

  async markOutreachTokenSent(token: string): Promise<void> {
    await db
      .update(outreachTokens)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(outreachTokens.token, token));
  }

  async markOutreachTokenResponded(token: string): Promise<void> {
    await db
      .update(outreachTokens)
      .set({ status: "responded", respondedAt: new Date() })
      .where(eq(outreachTokens.token, token));
  }

  // ===== FORM RESPONSES =====

  async createOrUpdateFormResponse(tokenId: string, data: CreateFormResponse): Promise<FormResponse> {
    const [response] = await db
      .insert(formResponses)
      .values({
        tokenId,
        responseData: data.responseData,
      })
      .onConflictDoUpdate({
        target: formResponses.tokenId,
        set: {
          responseData: data.responseData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return response;
  }

  // ===== PUBLIC FORM DATA =====

  async getPublicFormData(token: string): Promise<PublicFormData | undefined> {
    const tokenRecord = await this.getOutreachTokenByToken(token);
    if (!tokenRecord) return undefined;

    if (tokenRecord.expiresAt && new Date() > tokenRecord.expiresAt) {
      return undefined;
    }

    const [request] = await db
      .select()
      .from(formRequests)
      .where(eq(formRequests.id, tokenRecord.requestId));

    if (!request) return undefined;

    let recipientName = "";
    let recipientEmail: string | null = null;

    if (tokenRecord.recipientType === "vendor" && tokenRecord.vendor) {
      recipientName = tokenRecord.vendor.businessName;
      recipientEmail = tokenRecord.vendor.email;
    } else if (tokenRecord.recipientType === "contact" && tokenRecord.contact) {
      recipientName = `${tokenRecord.contact.firstName} ${tokenRecord.contact.lastName}`;
      recipientEmail = tokenRecord.contact.emailAddresses?.[0] || null;
    }

    const existingResponse = tokenRecord.response?.responseData || null;

    return {
      request: {
        id: request.id,
        title: request.title,
        description: request.description,
        formSchema: request.formSchema as FormSection[],
        dueDate: request.dueDate,
      },
      recipient: {
        id: tokenRecord.recipientId,
        type: tokenRecord.recipientType as RecipientType,
        name: recipientName,
        email: recipientEmail,
      },
      existingResponse: existingResponse as Record<string, unknown> | null,
    };
  }
}

export const formsStorage = new FormsStorage();
