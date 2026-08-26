import type { ArchiveTreeNode } from './corporateArchive.types';

export const flattenArchiveTree = (
  nodes: ArchiveTreeNode[]
): ArchiveTreeNode[] =>
  nodes.flatMap(node => [node, ...flattenArchiveTree(node.children)]);
