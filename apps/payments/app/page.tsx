import { createClient } from '@/utils/supabase/server';
import { getUser, getShopProducts, getUserCredits } from '@/utils/supabase/queries';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createClient();
  const [user, products] = await Promise.all([
    getUser(supabase),
    getShopProducts(supabase),
  ]);
  const credits = user ? await getUserCredits(supabase) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Kredyty eksportowe
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Kup kredyty aby eksportować swoje projekty
        </p>
      </div>

      {user && credits && (
        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Twoje saldo</h2>
          <p className="mt-2 text-3xl font-bold text-green-500">
            {credits.availableCredits} kredytów
          </p>
          {credits.hasUnlimited && (
            <p className="mt-1 text-sm text-zinc-400">
              Plan unlimited aktywny
            </p>
          )}
        </div>
      )}

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => (
          <div
            key={product.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-6"
          >
            <h3 className="text-lg font-semibold">{product.name}</h3>
            {product.description && (
              <p className="mt-2 text-sm text-zinc-400">{product.description}</p>
            )}
            <p className="mt-4 text-2xl font-bold">
              {(product.price / 100).toFixed(2)} PLN
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        {user ? (
          <Link
            href="/account"
            className="inline-block rounded-lg bg-zinc-100 px-6 py-3 font-semibold text-zinc-900 hover:bg-zinc-200"
          >
            Zarządzaj kontem
          </Link>
        ) : (
          <Link
            href="/signin"
            className="inline-block rounded-lg bg-zinc-100 px-6 py-3 font-semibold text-zinc-900 hover:bg-zinc-200"
          >
            Zaloguj się
          </Link>
        )}
      </div>
    </main>
  );
}
