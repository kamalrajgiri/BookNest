
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

function AppLayout() {
  return (
    <>
      <Navbar />

      <main>
        <Outlet />
      </main>

      <footer>
        <p>© {new Date().getFullYear()} BookNest. All rights reserved.</p>
      </footer>
    </>
  );
}

export default AppLayout;
