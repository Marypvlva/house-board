import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listAnnouncements } from "../api";

export default function Board() {
  const { slug } = useParams();
  const [items, setItems] = useState([]);

  useEffect(() => {
    listAnnouncements(slug).then(setItems);
  }, [slug]);

  return (
    <div>
      <h2>Объявления {slug}</h2>
      {items.length === 0 && <p>Пока нет объявлений.</p>}
      <ul style={{display:"grid", gap:12, listStyle:"none", padding:0}}>
        {items.map(a => (
          <li key={a.id} className="card">
            {a.pinned && <span className="badge">📌 Прикреплено</span>}
            <h3 style={{margin:"6px 0"}}>{a.title}</h3>
            <div style={{whiteSpace:"pre-wrap"}}>{a.content}</div>
            <div style={{marginTop:8, fontSize:12, opacity:.7}}>
              Автор: {a.author_email} • {new Date(a.created_at).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
