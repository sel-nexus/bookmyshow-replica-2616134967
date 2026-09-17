import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../components/auth/AuthProvider';

export const metadata: Metadata = {
  title: 'BookMyShow Replica | Your night starts here',
  description: 'A focused cinema authentication experience for the BookMyShow Replica.',
};

/** Provides the shared document shell and authentication context. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
