import Home from '@/components/Home';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function MainPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/projects');
  }
  return <Home />;
}
