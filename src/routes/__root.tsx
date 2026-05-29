import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrefsProvider } from "@/contexts/PrefsContext";
import { PomodoroProvider } from "@/contexts/PomodoroContext";
import { PomodoroFloating } from "@/components/PomodoroFloating";

const GTM_ID = "GTM-PRVSSQVG";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-bold text-gradient">404</h1>
        <p className="mt-4 text-app-muted">This page wandered off the plan.</p>
        <a href="/" className="mt-6 inline-block px-4 h-10 leading-10 rounded-lg bg-accent text-white font-medium">Go home</a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AI Life OS — Your AI productivity partner" },
      { name: "description", content: "AI Life OS turns natural conversation into a structured productivity system: plans, tasks, habits, and notes powered by Gemini." },
      { property: "og:title", content: "AI Life OS — Your AI productivity partner" },
      { property: "og:description", content: "AI Life OS turns natural conversation into a structured productivity system: plans, tasks, habits, and notes powered by Gemini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AI Life OS — Your AI productivity partner" },
      { name: "twitter:description", content: "AI Life OS turns natural conversation into a structured productivity system: plans, tasks, habits, and notes powered by Gemini." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0ec74ce1-40ec-4a25-8c1e-18f8203fbf25/id-preview-229e317f--2a6989fe-d83b-49c3-a592-36027185c85e.lovable.app-1776688538251.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0ec74ce1-40ec-4a25-8c1e-18f8203fbf25/id-preview-229e317f--2a6989fe-d83b-49c3-a592-36027185c85e.lovable.app-1776688538251.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: [
      {
        type: "text/javascript",
        children: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-theme="midnight">
      <head>
        <HeadContent />
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="gtm"
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <PrefsProvider>
        <PomodoroProvider>
          <Outlet />
          <PomodoroFloating />
          <Toaster position="top-right" theme="dark" richColors />
        </PomodoroProvider>
      </PrefsProvider>
    </AuthProvider>
  );
}
