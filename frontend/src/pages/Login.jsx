import { useState } from "react";
import { login, loginForHouse, setToken, me } from "../api";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("admin1@example.com");
  const [password, setPassword] = useState("admin12345");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const house = params.get("house"); // если пришли с /h/domX → тут domX

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      // логин строго для конкретного дома, если указан
      if (house) {
        const { access_token } = await loginForHouse(house, email, password);
        setToken(access_token);
        navigate(`/h/${house}/admin`);
      } else {
        const { access_token } = await login(email, password);
        setToken(access_token);
        const u = await me();
        navigate(`/h/${u.house_slug}/admin`);
      }
    } catch (err) {
      setError(err.message || "Ошибка входа");
    }
  }

  return (
    <div>
      <h2>Вход администратора {house ? `— дом ${house}` : ""}</h2>
      <form onSubmit={onSubmit} style={{display:"grid", gap:8, maxWidth:360}}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Пароль" />
        <button type="submit">Войти</button>
      </form>
      {error && <p style={{color:"red"}}>{error}</p>}
      <p style={{marginTop:8, fontSize:12, opacity:.7}}>
        Демо: admin1..5@example.com • пароль: admin12345
      </p>
    </div>
  );
}
