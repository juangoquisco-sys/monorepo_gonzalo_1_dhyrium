let preloadersPromise: Promise<typeof import('./routePreloaderGroups')> | null =
  null;

const getRoutePreloaders = () => {
  preloadersPromise ??= import('./routePreloaderGroups');
  return preloadersPromise;
};

export const preloadRouteChunk = (route: string) => {
  void getRoutePreloaders().then(({ preloadRouteChunk }) => {
    preloadRouteChunk(route);
  });
};
