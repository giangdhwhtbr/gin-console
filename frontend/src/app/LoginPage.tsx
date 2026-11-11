import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { isEmail, setEmail } from "./identity";

export function LoginPage() {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isEmail(value)) setEmail(value);
    else setInvalid(true);
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border bg-card p-6">
        <h1 className="text-lg font-semibold">gin-console</h1>
        <form noValidate onSubmit={submit} className="flex flex-col gap-3">
          <label htmlFor="login-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={invalid ? "login-email-error" : undefined}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          {invalid && (
            <p id="login-email-error" role="alert" className="text-sm text-destructive">
              That is not a valid email.
            </p>
          )}
          <Button type="submit">Continue</Button>
        </form>
        <p className="text-xs text-muted-foreground">Your email stays in this browser. It is not a password.</p>
      </div>
    </div>
  );
}
