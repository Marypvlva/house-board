import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { me, getToken, setToken } from "./api";
import "./App.css";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  async function hydrateUser() {
    if (!getToken()) { setUser(null); return; }
    try { setUser(await me()); } catch { setUser(null); }
  }

  // всегда подхватываем пользователя при переходах
  useEffect(() => { hydrateUser(); }, [location.key]);

  // реагируем на реальный логин/выход
  useEffect(() => {
    const handler = () => hydrateUser();
    window.addEventListener("token-changed", handler);
    return () => window.removeEventListener("token-changed", handler);
  }, []);

  // разбор текущего пути
  const m = location.pathname.match(/^\/h\/([^/]+)(?:\/admin)?$/);
  const currentSlug = m ? m[1] : null;
  const isAdminPage = /^\/h\/[^/]+\/admin$/.test(location.pathname);

  function logout() {
    const slug = currentSlug || (user ? user.house_slug : null);
    setToken("");
    setUser(null);
    navigate(slug ? `/h/${slug}` : "/"); // ведём на публичную доску
  }

  const loginHref = currentSlug ? `/login?house=${currentSlug}` : "/login";

  return (
    <div className="container">
      <header className="header">
        <nav className="nav">
          {/* "Моя доска" показываем кнопкой, если не на своей доске или на странице админки */}
          {user && (!currentSlug || currentSlug !== user.house_slug || isAdminPage) && (
            <Link className="btn-ghost" to={`/h/${user.house_slug}`}>Моя доска</Link>
          )}
        </nav>
        <div className="nav">
          {user ? (
            <>
              {!isAdminPage && (
                <Link className="btn-ghost" to={`/h/${user.house_slug}/admin`}>
                  Admin
                </Link>
              )}
              <button className="btn" onClick={logout}>Выйти</button>
            </>
          ) : (
            <Link className="btn-ghost" to={loginHref}>Log in</Link>
          )}
        </div>
      </header>
      <hr />
      <Outlet />
    </div>
  );
}
