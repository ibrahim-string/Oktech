import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setApiUser } from "./api.js";
import { STRINGS, uiLang } from "./i18n.js";
import { Feed } from "./pages/Feed.jsx";
import { HangoutDetail } from "./pages/HangoutDetail.jsx";
import { CreateHangout } from "./pages/CreateHangout.jsx";
import { Profile } from "./pages/Profile.jsx";
import { Avatar } from "./components/Avatar.jsx";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const STORAGE_KEY = "knot.userId";
const readStoredUser = () => {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
};

/** Tiny hash router: #/, #/h/:id, #/new, #/me */
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
  const [, page, id] = hash.split("/");
  return { page: page || "", id };
}

export const navigate = (path) => {
  window.location.hash = path;
};

export default function App() {
  const [users, setUsers] = useState(null);
  const [userId, setUserId] = useState(readStoredUser);
  const [bootError, setBootError] = useState(null);
  const route = useRoute();

  // Later reloads (e.g. after saving a profile) let the caller handle errors.
  const reloadUsers = useCallback(() => api.users().then(setUsers), []);
  const boot = useCallback(() => {
    setBootError(null);
    reloadUsers().catch(setBootError);
  }, [reloadUsers]);
  useEffect(boot, [boot]);

  const user = users?.find((u) => u.id === userId) ?? users?.[0] ?? null;
  setApiUser(user?.id ?? null);

  const switchUser = (id) => {
    setUserId(id);
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* storage unavailable: selection lasts for this session only */
    }
  };

  const lang = uiLang(user?.preferred_lang);
  const ctx = useMemo(
    () => ({ user, users, lang, t: STRINGS[lang], contentLang: user?.preferred_lang ?? "en", reloadUsers }),
    [user, users, lang, reloadUsers],
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
  if (!users) {
    return (
      <div className="boot">
        <Logo />
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="boot">
        <Logo />
        <p className="muted small boot-hint">
          The API is reachable but has no users yet. Run <code>npm run seed</code> in the backend, or restart it with AUTO_SEED enabled.
        </p>
      </div>
    );
  }

  let page;
  if (route.page === "h" && route.id) page = <HangoutDetail key={`${route.id}-${user.id}`} id={route.id} />;
  else if (route.page === "new") page = <CreateHangout key={user.id} />;
  else if (route.page === "me") page = <Profile key={user.id} />;
  else page = <Feed key={user.id} />;

  return (
    <AppContext.Provider value={ctx}>
      <div className="shell" lang={lang}>
        <header className="topbar">
          <a href="#/" className="brand" aria-label="KNOT home">
            <Logo />
          </a>
          <label className="switcher">
            <Avatar user={user} size={28} />
            <span className="sr-only">{ctx.t.demo_as}</span>
            <select value={user.id} onChange={(e) => switchUser(Number(e.target.value))}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.area}
                </option>
              ))}
            </select>
          </label>
        </header>

        <main className="content">{page}</main>

        <nav className="tabbar">
          <a href="#/" className={route.page === "" || route.page === "h" ? "active" : ""}>
            <span aria-hidden>🧭</span>
            {ctx.t.nav_feed}
          </a>
          <a href="#/new" className={`post ${route.page === "new" ? "active" : ""}`}>
            <span aria-hidden>＋</span>
            {ctx.t.nav_new}
          </a>
          <a href="#/me" className={route.page === "me" ? "active" : ""}>
            <span aria-hidden>🙂</span>
            {ctx.t.nav_profile}
          </a>
        </nav>
      </div>
    </AppContext.Provider>
  );
}

function Logo() {
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
