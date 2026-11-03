export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:not-sr-only focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>
  );
}
