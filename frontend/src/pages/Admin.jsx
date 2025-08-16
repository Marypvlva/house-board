import { useEffect, useState } from "react";
import { me, createAnnouncement, listAnnouncements, updateAnnouncement, deleteAnnouncement } from "../api";
import { useNavigate, useParams } from "react-router-dom";

export default function Admin() {
  const navigate = useNavigate();
  const { slug } = useParams();        // /h/:slug/admin

  const [info, setInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ id: null, title: "", content: "", pinned: false });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await me();
        // если вошли не на своём slug — перекидываем на правильный
        if (u.house_slug !== slug) {
          navigate(`/h/${u.house_slug}/admin`, { replace: true });
          return;
        }
        if (cancelled) return;
        setInfo(u);
        const anns = await listAnnouncements(slug);
        if (cancelled) return;
        setItems(anns);
      } catch {
        setError("Нужно войти");
        navigate(`/login?house=${slug}`, { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, slug]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!info) return;
    setError("");
    try {
      if (form.id) {
        await updateAnnouncement(form.id, { title: form.title, content: form.content, pinned: form.pinned });
      } else {
        await createAnnouncement(slug, { title: form.title, content: form.content, pinned: form.pinned });
      }
      setForm({ id: null, title: "", content: "", pinned: false });
      const anns = await listAnnouncements(slug);
      setItems(anns);
    } catch {
      setError("Не удалось сохранить");
    }
  }

  if (!info) {
    return (
      <div>
        <h2>Админка</h2>
        <p>{error || "Загрузка..."}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Админка — дом {slug}</h2>

      <form onSubmit={onSubmit} style={{display:"grid", gap:12, maxWidth:560, marginBottom:16}}>
        <input
          placeholder="Заголовок"
          value={form.title}
          onChange={e=>setForm({...form, title: e.target.value})}
          required
        />
        <textarea
          placeholder="Текст объявления"
          rows={6}
          value={form.content}
          onChange={e=>setForm({...form, content: e.target.value})}
          required
        />
        {/* аккуратный чекбокс с подписью в одну линию */}
        <label className="row">
          <input
            type="checkbox"
            checked={form.pinned}
            onChange={e=>setForm({...form, pinned: e.target.checked})}
          />
          Прикрепить наверх
        </label>

        <div className="row">
          <button type="submit" className="btn">
            {form.id ? "Сохранить изменения" : "Опубликовать"}
          </button>
          {form.id && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setForm({ id: null, title: "", content: "", pinned: false })}
            >
              Отмена
            </button>
          )}
        </div>
      </form>

      <h3>Мои объявления</h3>
      <ul style={{display:"grid", gap:12, listStyle:"none", padding:0}}>
        {items.map(a => (
          <li key={a.id} className="card">
            {a.pinned && <span className="badge">📌 Прикреплено</span>}
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:8}}>
              <h4 style={{margin:"6px 0"}}>{a.title}</h4>
              <div style={{display:"flex", gap:8}}>
                <button
                  className="btn-ghost"
                  onClick={() => setForm({ id: a.id, title: a.title, content: a.content, pinned: a.pinned })}
                  title="Редактировать"
                >
                  ✏️
                </button>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    if (confirm("Удалить объявление?")) {
                      try {
                        await deleteAnnouncement(a.id);
                        const anns = await listAnnouncements(slug);
                        setItems(anns);
                      } catch {
                        setError("Не удалось удалить");
                      }
                    }
                  }}
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div style={{whiteSpace:"pre-wrap"}}>{a.content}</div>
            <div className="meta" style={{marginTop:8}}>
              {new Date(a.created_at).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>

      {error && <p style={{color:"red"}}>{error}</p>}
    </div>
  );
}
