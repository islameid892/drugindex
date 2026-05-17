import { BulkVerification } from "@/components/BulkVerification";
import { X } from "lucide-react";

interface BulkVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkVerificationModal({ isOpen, onClose }: BulkVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Bulk Code Verification</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <BulkVerification />
        </div>
      </div>
    </div>
  );
}
