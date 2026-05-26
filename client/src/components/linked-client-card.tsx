import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PermissionGate } from "@/components/permission-gate";
import { EditableField, useFieldMutation } from "@/components/inline-edit";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { Client, Industry } from "@shared/schema";

interface LinkedClientCardProps {
  dealId: string;
  clientId: string | null | undefined;
  allClients: Pick<Client, "id" | "name" | "industryId">[];
  canEditDeal: boolean;
  onPrimaryClientSave: (field: string, value: unknown) => void;
  isPrimaryClientLoading: boolean;
  primaryClientError: string | null;
}

export function LinkedClientCard({
  dealId,
  clientId,
  allClients,
  canEditDeal,
  onPrimaryClientSave,
  isPrimaryClientLoading,
  primaryClientError,
}: LinkedClientCardProps) {
  const { toast } = useToast();
  const { can } = usePermissions();
  const canEditClient = can("clients.write");

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    enabled: Boolean(clientId),
  });

  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  const industriesMap = new Map(industries.map((i) => [i.id, i]));

  const {
    saveField: saveClientField,
    isFieldLoading: isClientFieldLoading,
    getFieldError: getClientFieldError,
  } = useFieldMutation({
    entityType: "clients",
    entityId: clientId || "",
    queryKey: ["/api/clients", clientId],
    additionalQueryKeys: [
      ["/api/clients"],
      ["/api/deals", dealId],
      ["/api/clients", clientId, "full"],
    ],
    onSuccess: () => {
      toast({ title: "Client updated" });
    },
  });

  const handleClientFieldSave = (field: string, value: unknown) => {
    let processedValue: unknown = value;
    if (value === "" && field === "industryId") {
      processedValue = null;
    }
    saveClientField(field, processedValue, field === "name" ? { required: true, minLength: 1 } : undefined);
  };

  const readOnlyClientRows = (
    <>
      <EditableField
        label="Name"
        value={client?.name || ""}
        field="name"
        testId="field-linked-client-name"
        type="text"
        disabled
        onSave={() => {}}
        placeholder="—"
      />
      <EditableField
        label="Industry"
        value={client?.industryId || ""}
        field="industryId"
        testId="field-linked-client-industry"
        type="text"
        disabled
        onSave={() => {}}
        displayValue={
          client?.industryId ? (
            <Badge variant="secondary">
              {industriesMap.get(client.industryId)?.name || client.industryId}
            </Badge>
          ) : undefined
        }
        placeholder="—"
      />
      <EditableField
        label="Website"
        value={client?.website || ""}
        field="website"
        testId="field-linked-client-website"
        type="text"
        disabled
        onSave={() => {}}
        displayValue={
          client?.website ? (
            <a
              href={
                client.website.startsWith("http")
                  ? client.website
                  : `https://${client.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              data-testid="link-linked-client-website"
              onClick={(e) => e.stopPropagation()}
            >
              {client.website}
            </a>
          ) : undefined
        }
        placeholder="—"
      />
    </>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base" data-testid="heading-deal-client">
          Client
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <EditableField
          label="Primary Client"
          value={clientId || ""}
          field="clientId"
          testId="field-client"
          type="select"
          disabled={!canEditDeal}
          options={allClients.map((c) => ({ value: c.id, label: c.name }))}
          onSave={onPrimaryClientSave}
          isLoading={isPrimaryClientLoading}
          error={primaryClientError}
          displayValue={
            client ? (
              <Link href={`/clients/${client.id}`}>
                <span
                  className="text-primary hover:underline cursor-pointer"
                  data-testid="link-deal-client"
                >
                  {client.name}
                </span>
              </Link>
            ) : (
              <span className="text-muted-foreground">
                No client assigned
              </span>
            )
          }
          placeholder="Select client"
        />

        <PermissionGate
          permission="clients.write"
          behavior="fallback"
          fallback={readOnlyClientRows}
        >
          <EditableField
            label="Name"
            value={client?.name || ""}
            field="name"
            testId="field-linked-client-name"
            type="text"
            disabled={!canEditClient || !clientId}
            onSave={handleClientFieldSave}
            isLoading={isClientFieldLoading("name")}
            error={getClientFieldError("name")}
            validation={{ required: true, minLength: 1 }}
            placeholder="Enter client name"
          />
          <EditableField
            label="Industry"
            value={client?.industryId || ""}
            field="industryId"
            testId="field-linked-client-industry"
            type="select"
            disabled={!canEditClient || !clientId}
            options={[
              { value: "", label: "Not set" },
              ...industries.map((i) => ({ value: i.id, label: i.name })),
            ]}
            onSave={handleClientFieldSave}
            isLoading={isClientFieldLoading("industryId")}
            error={getClientFieldError("industryId")}
            displayValue={
              client?.industryId ? (
                <Badge variant="secondary">
                  {industriesMap.get(client.industryId)?.name ||
                    client.industryId}
                </Badge>
              ) : undefined
            }
            placeholder="Select industry"
          />
          <EditableField
            label="Website"
            value={client?.website || ""}
            field="website"
            testId="field-linked-client-website"
            type="text"
            disabled={!canEditClient || !clientId}
            onSave={handleClientFieldSave}
            isLoading={isClientFieldLoading("website")}
            error={getClientFieldError("website")}
            displayValue={
              client?.website ? (
                <a
                  href={
                    client.website.startsWith("http")
                      ? client.website
                      : `https://${client.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  data-testid="link-linked-client-website"
                  onClick={(e) => e.stopPropagation()}
                >
                  {client.website}
                </a>
              ) : undefined
            }
            placeholder="Enter website URL"
          />
        </PermissionGate>
      </CardContent>
    </Card>
  );
}
