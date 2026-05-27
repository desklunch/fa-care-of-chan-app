import { DealIntakeTab } from "@/components/deal-intake-tab";

interface DealDiscoveryTabProps {
  dealId: string;
  canWrite: boolean;
  onSaveToGoogleDrive?: () => void;
  canSaveToGoogleDrive?: boolean;
}

export function DealDiscoveryTab(props: DealDiscoveryTabProps) {
  return <DealIntakeTab {...props} kind="discovery" />;
}
