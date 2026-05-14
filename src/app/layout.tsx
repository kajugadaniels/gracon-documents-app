import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { AppToaster } from '@/components/ui';
import './globals.css';

const dmSans = DM_Sans({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-dm-sans',
    display: 'swap',
});

export const metadata: Metadata = {
    title: {
        default: 'Documents | Gracon 360',
        template: '%s | Gracon 360',
    },
    description: 'Create, edit, sign, and manage your official documents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={dmSans.variable}>
            <body className="font-sans antialiased" suppressHydrationWarning>
                <AppToaster />
                {children}
            </body>
        </html>
    );
}
