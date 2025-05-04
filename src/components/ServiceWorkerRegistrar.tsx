'use client';

import { useEffect } from 'react';
import { Workbox } from 'workbox-window';

const ServiceWorkerRegistrar = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      const wb = new Workbox('/sw.js'); // Path to your generated service worker

      wb.addEventListener('installed', event => {
        console.log('Service worker installed!');
        if (event.isUpdate) {
            // Optional: Prompt user to refresh if a new SW has been installed.
            // Example: Show a toast notification
             console.log('New content is available; please refresh.');
            // Consider showing a UI element to refresh
             // if (confirm('New content is available. Do you want to refresh?')) {
             //   window.location.reload();
             // }
        }
      });

      wb.addEventListener('activated', event => {
         console.log('Service worker activated!');
         // If this is the initial activation, it might be useful for logging
         if (!event.isUpdate) {
             console.log('Service worker activated for the first time!');
         }
      });

       wb.addEventListener('waiting', (event) => {
            console.log(
              `A new service worker has installed, but it's waiting to activate.` +
              `You can trigger the activation by closing all tabs for this page.`
            );
            // Optionally, prompt user to update
            // wb.messageSkipWaiting(); // Force activation immediately (can be disruptive)
       });

       wb.addEventListener('externalinstalled', (event) => {
         console.log('External service worker installed.');
         // Fired when an external SW takes control (e.g., from another tab)
       });

        wb.addEventListener('externalactivated', (event) => {
          console.log('External service worker activated.');
          // Fired when an external SW takes control (e.g., from another tab)
        });


      // Register the service worker
      wb.register()
        .then(registration => {
          console.log('Service Worker registered successfully with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });

        // Optional: Check for updates periodically
        // const updateInterval = setInterval(async () => {
        //   await wb.update();
        // }, 1000 * 60 * 60); // Check every hour

        // return () => clearInterval(updateInterval); // Clean up interval

    } else if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'production') {
       console.log('Service worker not registered in development mode.');
       // Optionally unregister existing SW in development
        // navigator.serviceWorker.getRegistrations().then(registrations => {
        //   for(let registration of registrations) {
        //      registration.unregister();
        //      console.log('Unregistered existing service worker in development.');
        //   }
        // });
    } else {
       console.log('Service workers are not supported in this browser.');
    }
  }, []);

  return null; // This component doesn't render anything
};

export default ServiceWorkerRegistrar;
