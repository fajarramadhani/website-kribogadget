"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/lib/validation/admin";

const Ctx = createContext<ActionState>({ ok: false });

/**
 * Form untuk server action admin. Dikirim lewat transition (bukan atribut action)
 * agar isian tidak di-reset ketika server menolak input.
 */
export function ActionForm({
  action,
  submitLabel,
  submitVariant = "primary",
  children,
  className,
  resetOnSuccess,
  onSuccess,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  submitLabel: string;
  submitVariant?: "primary" | "dark" | "danger" | "outline";
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false } as ActionState);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
    } else toast.error(state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Ctx.Provider value={state}>
      <form
        className={cn("space-y-5", className)}
        ref={ref}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" variant={submitVariant} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {pending ? "Menyimpan…" : submitLabel}
          </Button>
          {state.message && !state.ok && (
            <p role="alert" className="text-sm font-medium text-danger">
              {state.message}
            </p>
          )}
        </div>
      </form>
    </Ctx.Provider>
  );
}

/** FormField yang otomatis menampilkan error server berdasarkan nama field. */
export function AField({
  name,
  label,
  hint,
  required,
  children,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const state = useContext(Ctx);
  return (
    <FormField
      label={label}
      htmlFor={name}
      hint={hint}
      required={required}
      error={state.fieldErrors?.[name]?.[0]}
      className={className}
    >
      {children}
    </FormField>
  );
}
