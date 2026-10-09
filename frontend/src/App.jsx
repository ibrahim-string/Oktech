import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, hasSession, setToken } from "./api.js";
import { STRINGS, uiLang } from "./i18n.js";
import { Feed } from "./pages/Feed.jsx";
import { HangoutDetail } from "./pages/HangoutDetail.jsx";
import { CreateHangout } from "./pages/CreateHangout.jsx";
import { Profile } from "./pages/Profile.jsx";
import { Onboarding } from "./pages/Onboarding.jsx";
import { Meet } from "./pages/Meet.jsx";
import { Conversation } from "./pages/Conversation.jsx";
import { Help } from "./pages/Help.jsx";
import { AidForm } from "./pages/AidForm.jsx";
import { Admin } from "./pages/Admin.jsx";
import { Avatar } from "./components/Avatar.jsx";
import { EmergencyBanner } from "./components/EmergencyBanner.jsx";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

/** Tiny hash router: #/, #/h/:id, #/new, #/meet, #/c/:id, #/help, #/help/new, #/me, #/admin */
function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash || "#/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const [, page, id] = hash.split("?")[0].split("/");
  return { page: page || "", id };
}

export const navigate = (path) => {
  window.location.hash = path;
};

// Before onboarding, guess the UI language from the browser.
const browserLang = () => (navigator.language?.toLowerCase().startsWith("ja") ? "ja" : "en");

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(hasSession());
  const [bootError, setBootError] = useState(null);
  const [safety, setSafety] = useState(null);
  const route = useRoute();

  const boot = useCallback(() => {
    if (!hasSession()) return setBooting(false);
    setBootError(null);
    setBooting(true);
    api
      .me()
      .then(setUser)
      .catch((err) => {
        if (err.status === 401) setToken(null); // session gone (e.g. database reset): start over
        else setBootError(err);
      })
      .finally(() => setBooting(false));
  }, []);
  useEffect(boot, [boot]);

  const lang = uiLang(user?.preferred_lang ?? browserLang());
  const contentLang = user?.preferred_lang ?? lang;

  // Safety status powers the emergency banner on every screen; refresh every minute.
  const reloadSafety = useCallback(() => api.safety().then(setSafety).catch(() => {}), []);
  useEffect(() => {
    if (!user) return;
    reloadSafety();
    const timer = setInterval(reloadSafety, 60_000);
    return () => clearInterval(timer);
  }, [user?.id, contentLang, reloadSafety]);

  const ctx = useMemo(
    () => ({ user, setUser, lang, t: STRINGS[lang], contentLang, safety, reloadSafety }),
    [user, lang, contentLang, safety, reloadSafety],
  );

  if (bootError) {
    return (
      <div className="boot">
        <Logo />
        <p className="error">{bootError.message}</p>
        {bootError.hint && <p className="muted small boot-hint">{bootError.hint}</p>}
        <button className="btn" onClick={boot}>Try again</button>
      </div>
    );
  }
  if (booting) {
    return (
      <div className="boot">
        <Logo />
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (!user) {
    return (
      <AppContext.Provider value={ctx}>
        <Onboarding
          onDone={(token, u) => {
            setToken(token);
            setUser(u);
          }}
        />
      </AppContext.Provider>
    );
  }

  let page;
  const { page: p, id } = route;
  if (p === "h" && id) page = <HangoutDetail key={id} id={id} />;
  else if (p === "new") page = <CreateHangout />;
  else if (p === "meet") page = <Meet />;
  else if (p === "c" && id) page = <Conversation key={id} id={id} />;
  else if (p === "help" && id === "new") page = <AidForm />;
  else if (p === "help") page = <Help />;
  else if (p === "me") page = <Profile />;
  else if (p === "admin") page = <Admin />;
  else page = <Feed />;

  const tab = p === "" || p === "h" || p === "new" ? "feed" : p === "c" ? "meet" : p;

  return (
    <AppContext.Provider value={ctx}>
      <div className="shell" lang={lang}>
        <header className="topbar">
          <a href="#/" className="brand" aria-label="KNOT home">
            <Logo />
          </a>
          <a href="#/me" className="me-chip">
            <Avatar user={user} size={26} />
            <span>{user.name}</span>
          </a>
        </header>

        {safety?.emergency && tab !== "help" && <EmergencyBanner />}

        <main className="content">{page}</main>

        <nav className="tabbar">
          <a href="#/" className={tab === "feed" ? "active" : ""}>
            <span aria-hidden>🧭</span>
            {ctx.t.nav_feed}
          </a>
          <a href="#/meet" className={tab === "meet" ? "active" : ""}>
            <span aria-hidden>🎲</span>
            {ctx.t.nav_meet}
          </a>
          <a href="#/help" className={`${tab === "help" ? "active" : ""} ${safety?.emergency ? "alerting" : ""}`}>
            <span aria-hidden>🤝</span>
            {ctx.t.nav_help}
          </a>
          <a href="#/me" className={tab === "me" ? "active" : ""}>
            <span aria-hidden>🙂</span>
            {ctx.t.nav_profile}
          </a>
        </nav>
      </div>
    </AppContext.Provider>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden>
        <rect width="64" height="64" rx="16" fill="var(--indigo)" />
        <path d="M18 32c0-8 6-12 14-12s14 4 14 12-6 12-14 12" fill="none" stroke="var(--vermilion)" strokeWidth="6" strokeLinecap="round" />
        <path d="M46 32c0 8-6 12-14 12" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      </svg>
      KNOT
    </span>
  );
}
