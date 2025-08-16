const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("token") || "";
}
export function setToken(t) {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
  // сообщаем приложению, что токен изменился
  window.dispatchEvent(new Event("token-changed"));
}

// аккуратно читаем detail из JSON, если сервер его вернул
async function parseOrDefault(res, fallbackMsg) {
  try {
    const j = await res.json();
    if (j && j.detail) throw new Error(j.detail);
    throw new Error(fallbackMsg);
  } catch {
    throw new Error(fallbackMsg);
  }
}

export async function login(email, password) {
  const body = new URLSearchParams();
  body.append("username", email);
  body.append("password", password);
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) await parseOrDefault(res, "Неверный email или пароль");
  return res.json();
}

export async function loginForHouse(slug, email, password) {
  const body = new URLSearchParams();
  body.append("username", email);
  body.append("password", password);
  const res = await fetch(`${API}/auth/login/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) {
    await parseOrDefault(res, "Неверный email или пароль или вы не на ссылке своего дома");
  }
  return res.json();
}

export async function me() {
  const res = await fetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  if (!res.ok) throw new Error("Не авторизован");
  return res.json();
}

export async function listHouses() {
  const res = await fetch(`${API}/houses`);
  return res.json();
}

export async function listAnnouncements(slug) {
  const res = await fetch(`${API}/houses/${slug}/announcements`);
  return res.json();
}

export async function createAnnouncement(slug, data) {
  const res = await fetch(`${API}/houses/${slug}/announcements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    try { const j = await res.json(); throw new Error(j.detail || "Ошибка публикации"); }
    catch { throw new Error("Ошибка публикации"); }
  }
  return res.json();
}

export async function updateAnnouncement(id, data) {
  const res = await fetch(`${API}/announcements/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Ошибка редактирования");
  return res.json();
}

export async function deleteAnnouncement(id) {
  const res = await fetch(`${API}/announcements/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  if (!res.ok) throw new Error("Ошибка удаления");
  return res.json();
}
