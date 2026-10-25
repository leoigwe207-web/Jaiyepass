export default function StaticLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">{children}</div>
  );
}
