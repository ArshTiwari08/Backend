import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="page-center">
      <div className="auth-card">
        <h1>Welcome{user?.name ? `, ${user.name}` : ''}</h1>
        <p>You're logged in as {user?.email}</p>
        <button onClick={handleLogout}>Log out</button>
      </div>
    </div>
  );
}
