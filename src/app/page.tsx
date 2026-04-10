/**
 * Redirects the app root to the protected documents index.
 */
import { redirect } from 'next/navigation';

export default function RootPage() {
    redirect('/documents');
}
