"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <main>
        <h1 className="text-4xl font-bold mb-3">Crypto Clash</h1>
        <p className="text-lg text-gray-700 mb-8">Welcome! Choose a page below:</p>

        <ul className="space-y-3">
          <li>
            <Link href="/clash" className="text-blue-600 hover:bg-gray-100 hover:text-blue-800 px-2 py-1 inline-block">
              Crypto Clash - Battle with others
            </Link>
          </li>
        </ul>
      </main>
    </div>
  );
}
