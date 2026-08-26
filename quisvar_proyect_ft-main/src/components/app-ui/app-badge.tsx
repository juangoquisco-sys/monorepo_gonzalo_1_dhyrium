import * as React from 'react';

import { Badge } from '../ui/badge';

type AppBadgeProps = React.ComponentProps<typeof Badge>;

function AppBadge(props: AppBadgeProps) {
  return <Badge {...props} />;
}

export { AppBadge };
