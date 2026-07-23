import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
};

type State = { opts: ConfirmOptions; resolve: (v: boolean) => void } | null;

let setStateExternal: ((s: State) => void) | null = null;

/**
 * Imperative confirmation dialog. Returns a Promise<boolean>.
 * Requires <ConfirmDialogHost /> mounted once at the app root.
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!setStateExternal) {
      // Fallback if host not mounted (SSR or misuse)
      // eslint-disable-next-line no-alert
      if (typeof window !== "undefined") resolve(window.confirm(opts.title));
      else resolve(false);
      return;
    }
    setStateExternal({ opts, resolve });
  });
}

export function ConfirmDialogHost() {
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    setStateExternal = setState;
    return () => {
      setStateExternal = null;
    };
  }, []);

  const handle = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };

  const opts = state?.opts;

  return (
    <AlertDialog open={!!state} onOpenChange={(v) => { if (!v) handle(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
          {opts?.description && (
            <AlertDialogDescription>{opts.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handle(false)}>
            {opts?.cancelText ?? "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handle(true)}
            className={cn(
              opts?.variant === "destructive" &&
                buttonVariants({ variant: "destructive" }),
            )}
          >
            {opts?.confirmText ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
