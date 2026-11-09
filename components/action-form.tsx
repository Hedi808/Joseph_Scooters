"use client";
import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/actions";
export function ActionForm({
  action,
  children,
  label = "Enregistrer",
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  children: ReactNode;
  label?: string;
}) {
  const [state, submit, pending] = useActionState(action, { message: "" });
  return (
    <form action={submit} className="form-stack">
      {children}
      <button className="button" disabled={pending}>
        {pending ? "…" : label}
      </button>
      {state.message && (
        <p role="status" className={state.ok ? "success-message" : "notice"}>
          {state.message}
        </p>
      )}
      {state.url && (
        <a className="button dark" href={state.url}>
          Continuer →
        </a>
      )}
    </form>
  );
}
