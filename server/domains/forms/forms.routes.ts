import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { formsStorage } from "./forms.storage";
import { logAuditEvent } from "../../audit";
import { insertFormTemplateSchema, updateFormTemplateSchema, insertFormRequestSchema, updateFormRequestSchema, insertFormResponseSchema, RecipientType } from "@shared/schema";
import { sendFormRequestEmail } from "../../email";

export function registerFormsRoutes(app: Express): void {
  // ==========================================
  // FORM TEMPLATE ROUTES
  // ==========================================

  app.get("/api/form-templates", isAuthenticated, async (req: any, res) => {
    try {
      const templates = await formsStorage.getFormTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching form templates:", error);
      res.status(500).json({ message: "Failed to fetch form templates" });
    }
  });

  app.get("/api/form-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const template = await formsStorage.getFormTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching form template:", error);
      res.status(500).json({ message: "Failed to fetch form template" });
    }
  });

  app.post("/api/form-templates", isAuthenticated, async (req: any, res) => {
    try {
      const result = insertFormTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const userId = req.user.claims.sub;
      const template = await formsStorage.createFormTemplate(result.data, userId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "form_template",
        entityId: template.id,
        status: "success",
        metadata: { name: template.name },
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating form template:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "form_template",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create form template" });
    }
  });

  app.patch("/api/form-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const result = updateFormTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const template = await formsStorage.updateFormTemplate(req.params.id, result.data);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }

      await logAuditEvent(req, {
        action: "update",
        entityType: "form_template",
        entityId: req.params.id,
        status: "success",
      });

      res.json(template);
    } catch (error) {
      console.error("Error updating form template:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "form_template",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update form template" });
    }
  });

  app.delete("/api/form-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const template = await formsStorage.getFormTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }

      await formsStorage.deleteFormTemplate(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "form_template",
        entityId: req.params.id,
        status: "success",
        metadata: { name: template.name },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form template:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "form_template",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to delete form template" });
    }
  });

  // ==========================================
  // FORM REQUEST ROUTES
  // ==========================================

  app.get("/api/form-requests", isAuthenticated, async (req: any, res) => {
    try {
      const requests = await formsStorage.getFormRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching form requests:", error);
      res.status(500).json({ message: "Failed to fetch form requests" });
    }
  });

  app.get("/api/form-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const request = await formsStorage.getFormRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching form request:", error);
      res.status(500).json({ message: "Failed to fetch form request" });
    }
  });

  app.post("/api/form-requests", isAuthenticated, async (req: any, res) => {
    try {
      const result = insertFormRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const userId = req.user.claims.sub;
      const request = await formsStorage.createFormRequest(result.data, userId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "form_request",
        entityId: request.id,
        status: "success",
        metadata: { title: request.title },
      });

      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating form request:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "form_request",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create form request" });
    }
  });

  app.patch("/api/form-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const result = updateFormRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const existingRequest = await formsStorage.getFormRequestById(req.params.id);
      if (!existingRequest) {
        return res.status(404).json({ message: "Form request not found" });
      }
      
      if (existingRequest.status !== "draft" && result.data.formSchema !== undefined) {
        return res.status(400).json({ message: "Cannot modify form schema of non-draft requests" });
      }

      const request = await formsStorage.updateFormRequest(req.params.id, result.data);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }

      await logAuditEvent(req, {
        action: "update",
        entityType: "form_request",
        entityId: req.params.id,
        status: "success",
      });

      res.json(request);
    } catch (error) {
      console.error("Error updating form request:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "form_request",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update form request" });
    }
  });

  app.delete("/api/form-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const request = await formsStorage.getFormRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }

      await formsStorage.deleteFormRequest(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "form_request",
        entityId: req.params.id,
        status: "success",
        metadata: { title: request.title },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form request:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "form_request",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to delete form request" });
    }
  });

  app.post("/api/form-requests/:id/recipients", isAuthenticated, async (req: any, res) => {
    try {
      const { recipients } = req.body as {
        recipients: Array<{ type: RecipientType; id: string }>;
      };

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: "Recipients array is required" });
      }

      const request = await formsStorage.getFormRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }

      const tokens = await formsStorage.createOutreachTokens(req.params.id, recipients);

      await logAuditEvent(req, {
        action: "create",
        entityType: "outreach_token",
        entityId: req.params.id,
        status: "success",
        metadata: { recipientCount: recipients.length },
      });

      res.status(201).json({ count: tokens.length, tokens });
    } catch (error) {
      console.error("Error adding recipients:", error);
      res.status(500).json({ message: "Failed to add recipients" });
    }
  });

  app.post("/api/form-requests/:id/send", isAuthenticated, async (req: any, res) => {
    try {
      const request = await formsStorage.getFormRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }

      if (!request.tokens || request.tokens.length === 0) {
        return res.status(400).json({ message: "No recipients to send to" });
      }

      const pendingTokens = request.tokens.filter((t) => t.status === "pending" && !t.sentAt);
      if (pendingTokens.length === 0) {
        return res.status(400).json({ message: "No pending recipients to send to" });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      let sentCount = 0;
      const errors: string[] = [];

      for (const tokenRecord of pendingTokens) {
        let recipientEmail: string | null = null;
        let recipientName: string = "";

        if (tokenRecord.recipientType === "vendor" && tokenRecord.vendor) {
          recipientEmail = tokenRecord.vendor.email;
          recipientName = tokenRecord.vendor.businessName;
        } else if (tokenRecord.recipientType === "contact" && tokenRecord.contact) {
          recipientEmail = tokenRecord.contact.emailAddresses?.[0] || null;
          recipientName = `${tokenRecord.contact.firstName} ${tokenRecord.contact.lastName}`;
        }

        if (!recipientEmail) {
          errors.push(`No email for ${recipientName || tokenRecord.recipientId}`);
          continue;
        }

        try {
          const formUrl = `${baseUrl}/form/${tokenRecord.token}`;
          const emailResult = await sendFormRequestEmail(
            recipientEmail,
            recipientName,
            request.title,
            request.description || "",
            formUrl,
            request.dueDate
          );

          if (!emailResult.success) {
            console.error(`Failed to send email to ${recipientEmail}:`, emailResult.error);
            errors.push(`Failed to send to ${recipientEmail}`);
            continue;
          }

          await formsStorage.markOutreachTokenSent(tokenRecord.token);
          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send email to ${recipientEmail}:`, emailError);
          errors.push(`Failed to send to ${recipientEmail}`);
        }
      }

      await formsStorage.updateFormRequest(req.params.id, { status: "sent" } as never);

      await logAuditEvent(req, {
        action: "email_sent",
        entityType: "form_request",
        entityId: req.params.id,
        status: "success",
        metadata: { sentCount, errors },
      });

      res.json({ sentCount, errors });
    } catch (error) {
      console.error("Error sending form request:", error);
      await logAuditEvent(req, {
        action: "email_sent",
        entityType: "form_request",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to send form request" });
    }
  });

  app.get("/api/form-requests/:id/preview", isAuthenticated, async (req: any, res) => {
    try {
      const request = await formsStorage.getFormRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }

      res.json({
        request: {
          title: request.title,
          description: request.description,
          formSchema: request.formSchema,
          dueDate: request.dueDate,
        },
        recipient: {
          name: "Preview Recipient",
          type: "vendor",
          email: "preview@example.com",
        },
        isPreview: true,
        existingResponse: null,
      });
    } catch (error) {
      console.error("Error fetching form preview:", error);
      res.status(500).json({ message: "Failed to fetch form preview" });
    }
  });

  // ==========================================
  // PUBLIC FORM ROUTES (no authentication required)
  // ==========================================

  app.get("/api/form/:token", async (req, res) => {
    try {
      const formData = await formsStorage.getPublicFormData(req.params.token);
      if (!formData) {
        return res.status(404).json({ message: "Form not found or expired" });
      }
      res.json(formData);
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.post("/api/form/:token", async (req, res) => {
    try {
      const tokenRecord = await formsStorage.getOutreachTokenByToken(req.params.token);
      if (!tokenRecord) {
        return res.status(404).json({ message: "Form not found or expired" });
      }

      if (tokenRecord.expiresAt && new Date() > tokenRecord.expiresAt) {
        return res.status(410).json({ message: "This form link has expired" });
      }

      const result = insertFormResponseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const response = await formsStorage.createOrUpdateFormResponse(tokenRecord.id, result.data);
      await formsStorage.markOutreachTokenResponded(req.params.token);

      res.json({ message: "Response submitted successfully", response });
    } catch (error) {
      console.error("Error submitting form response:", error);
      res.status(500).json({ message: "Failed to submit response" });
    }
  });
}
