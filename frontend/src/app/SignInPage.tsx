import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { signIn, type SignInResult } from "./session";

type Failure = Exclude<SignInResult, { ok: true }>;

function message(failure: Failure): string {
  switch (failure.reason) {
    case "invalid":
      return "Wrong username or password";
    case "locked":
      return `Too many attempts. Try again in ${failure.minutes} ${failure.minutes === 1 ? "minute" : "minutes"}`;
    case "error":
      return "Could not reach the console. Try again.";
  }
}

export function SignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await signIn(username, password);
    setSubmitting(false);
    if (!result.ok) {
      setFailure(result);
      setPassword("");
    }
  };
  const field = "h-9 rounded-md border bg-background px-3 text-sm";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border bg-card p-6">
        <h1 className="text-2xl font-semibold">gin-console</h1>
        <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
          <label htmlFor="signin-username" className="text-sm font-medium">
            Username
          </label>
          <input
            id="signin-username"
            type="text"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={field}
          />
          <label htmlFor="signin-password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={field}
          />
          {failure !== null && (
            <p role="alert" className="text-sm text-destructive">
              {message(failure)}
            </p>
          )}
          <Button type="submit" disabled={submitting}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
