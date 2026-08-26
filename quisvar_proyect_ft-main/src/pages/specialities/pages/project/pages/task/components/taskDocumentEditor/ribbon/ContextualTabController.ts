import type { RibbonSchema, RibbonTab } from './ribbonTypes';

export interface RibbonSelectionContext {
  table: boolean;
  image: boolean;
  shape: boolean;
  chart: boolean;
  'header-footer': boolean;
}

export class ContextualTabController {
  visibleTabs(schema: RibbonSchema, context: RibbonSelectionContext): RibbonTab[] {
    return schema.tabs.filter(tab => !tab.contextual || Boolean(tab.context && context[tab.context]));
  }
}

