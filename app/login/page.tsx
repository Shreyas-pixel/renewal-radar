import { redirect } from "next/navigation";
import { login } from "../actions";
import { Header, Flash, RadarMark } from "@/components/ui";
import { DEMO_PASSWORD, DEMO_USERNAME, isLoggedIn } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  if (await isLoggedIn()) redirect("/");
  const { msg } = await searchParams;
  const showHint = !process.env.DEMO_PASSWORD;
  return (
    <>
      <Header loggedIn={false} />
      <main className="login-wrap">
        <div className="login card">
          <div className="row" style={{ color: "var(--accent)" }}>
            <RadarMark />
            <h1 style={{ fontSize: 24, color: "var(--ink)" }}>Renewal Radar</h1>
          </div>
          <p className="tagline">Claude reads the fine print. Renewal Radar remembers it.</p>
          <Flash msg={msg} />
          <form action={login} className="stack">
            <label>
              <span>Username</span>
              <input name="username" type="email" required defaultValue={showHint ? DEMO_USERNAME : ""} />
            </label>
            <label>
              <span>Password</span>
              <input name="password" type="password" required />
            </label>
            <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>Log in</button>
          </form>
          {showHint && (
            <div className="hint">
              Test login: <b>{DEMO_USERNAME}</b> / <b>{DEMO_PASSWORD}</b>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
