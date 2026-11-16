
import { Link } from 'react-router-dom';

function Unauthorized() {
  return (
    <main>
      <h1>403 - Access Denied</h1>
      <p>You don't have permission to access this page.</p>
      <Link to="/">Return to home</Link>
    </main>
  );
}

export default Unauthorized;
