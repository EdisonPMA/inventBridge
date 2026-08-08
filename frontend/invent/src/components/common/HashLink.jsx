import { NavLink, useNavigate } from "react-router-dom";

/**
 * A NavLink that handles in-page hash navigation smoothly.
 * Supports paths like "/home#section".
 */
export default function HashLink({ to, children, onClick, className, end, ...props }) {
  const navigate = useNavigate();
  const [path, hash] = to.split("#");

  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (hash) {
      e.preventDefault();
      navigate(path || "/");
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <NavLink to={path || to} end={end} className={className} onClick={handleClick} {...props}>
      {children}
    </NavLink>
  );
}
