import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

// routing
import router from 'routes';

// project imports
import NavigationScroll from 'layout/NavigationScroll';
import ThemeCustomization from 'themes';
import { ToastProvider } from 'contexts/ToastContext';

// ==============================|| APP ||============================== //

export default function App() {
  useEffect(() => {
    const blockMenu = (e) => e.preventDefault();

    const blockKeys = (e) => {
      // F12
      if (e.key === 'F12') { e.preventDefault(); return; }
      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools)
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
      // Ctrl+U (view source)
      if (e.ctrlKey && e.key.toUpperCase() === 'U') { e.preventDefault(); return; }
      // Ctrl+S (save page)
      if (e.ctrlKey && e.key.toUpperCase() === 'S') { e.preventDefault(); return; }
    };

    document.addEventListener('contextmenu', blockMenu);
    document.addEventListener('keydown', blockKeys);

    return () => {
      document.removeEventListener('contextmenu', blockMenu);
      document.removeEventListener('keydown', blockKeys);
    };
  }, []);

  return (
    <ThemeCustomization>
      <ToastProvider>
        <NavigationScroll>
          <>
            <RouterProvider router={router} />
          </>
        </NavigationScroll>
      </ToastProvider>
    </ThemeCustomization>
  );
}
