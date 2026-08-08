import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AuthForm } from "./auth-form";
import type { UserProfile } from "@/services/auth-service";

export type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (user?: UserProfile) => void;
  redirectUrl?: string;
  title?: string;
  description?: string;
};

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
  redirectUrl = "/dashboard",
  title = "Sign in to Copilot",
  description = "Access your AI business strategy workspace and startup tools.",
}: AuthModalProps) {
  const handleSuccess = (user?: UserProfile) => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess(user);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 max-h-[90vh] overflow-y-auto z-50">
        <DialogHeader className="mb-4">
          <DialogTitle className="font-display text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>
        <AuthForm onSuccess={handleSuccess} redirectUrl={redirectUrl} />
      </DialogContent>
    </Dialog>
  );
}
