const PALETTE = ["#f26b4f", "#3a7d6c", "#5b6ee1", "#d99a1e", "#b5508a", "#2f8fb3"];

export function Avatar({ user, size = 36 }) {
  const bg = PALETTE[(user.id - 1) % PALETTE.length];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }}
      aria-hidden
    >
      {user.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
