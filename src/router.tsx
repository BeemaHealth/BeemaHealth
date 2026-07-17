import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // Default `never` strips trailing slashes from <Link href>s. GitHub Pages
    // 301s bare paths → slash form (sitemap/canonicals), so preserve what we
    // write: marketing links use `/contact/`, app routes can stay bare.
    trailingSlash: "preserve",
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
