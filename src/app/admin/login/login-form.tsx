"use client";

import { ActionForm, AField } from "@/components/admin/action-form";
import { Input } from "@/components/ui/form";
import { login } from "@/lib/actions/auth";

export function LoginForm({ next, disabled }: { next?: string; disabled?: boolean }) {
  return (
    <ActionForm action={login} submitLabel="Masuk" submitVariant="dark">
      <input type="hidden" name="next" value={next ?? ""} />
      <AField name="email" label="Email" required>
        <Input id="email" name="email" type="email" autoComplete="username" required disabled={disabled} />
      </AField>
      <AField name="password" label="Password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required disabled={disabled} />
      </AField>
    </ActionForm>
  );
}
