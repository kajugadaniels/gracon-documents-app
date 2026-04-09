import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/shared/AuthProvider';
import './globals.css';

const dmSans = DM_Sans({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-dm-sans',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Gracon 360 — Documents',
    description: 'Create, edit, sign, and manage your official documents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={dmSans.variable}>
            <body>
                <AuthProvider>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: 'rgba(255,255,255,0.92)',
                                border: '1px solid rgba(91,35,255,0.15)',
                                color: 'var(--color-text-primary)',
                                fontFamily: 'var(--font-sans)',
                                fontSize: '13px',
                                backdropFilter: 'blur(20px)',
                            },
                        }}
                    />
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}