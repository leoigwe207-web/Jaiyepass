# JaiyePass — preview run doc

## How to reproduce the artifacts

1. `npm install` (project package manager: npm; lockfile `package-lock.json` if present, else first install creates it).
2. There is **no `.env.local`** in this checkout and none to copy — the main checkout is the
   same directory. The app intentionally runs in its documented degraded mode without env
   vars: public pages render with empty states, DB-backed pages show a "Database not
   connected" empty state. To enable full behavior later, copy `.env.example` → `.env.local`
   and fill in Supabase / Paystack / Resend values (procedures only — values live in env
   files, never here).
3. No build artifacts are needed for the dev server. (`npm run build` produces a production
   `.next` build, but the preview runs `next dev`.)

## How to run the server

- Start detached (PowerShell), logging stdout/stderr to different files:

  ```
  powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
  ```

- **Port:** this environment exports `PORT=0`, so `next dev` would bind an OS-assigned
  ephemeral port by default. The current procedure pins port 3000 explicitly by appending
  `'--','--port','3000'` to the ArgumentList after `'dev'` (3000 was verified free first).
  If 3000 is taken, pick another free port and keep the same flags; the registered preview
  must match whatever port the log reports (`- Local: http://localhost:<port>`).
- **Detach quirk (verified 2026-10-22):** the PowerShell Start-Process call may exceed the
  shell tool's timeout before it prints the pid, but the detached server still survives.
  Confirm by reading the log for `✓ Ready` and by `netstat` on the logged port; find the
  owning pid with `netstat -ano | grep LISTENING | grep :<port>`.
- Readiness: poll the logged URL until it answers HTTP (Next dev compiles the first route
  on demand — allow 50s+ for boot and another minute before the first full response).
- Stop: kill the netstat-reported pid (the `next dev` node process).
