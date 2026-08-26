import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import type { ArchiveTreeNode } from '../corporateArchive.types';

type Props = {
  nodes: ArchiveTreeNode[];
  selectedFolderId?: string;
  onSelect: (folderId: string) => void;
};

function Node({
  node,
  selectedFolderId,
  onSelect,
  depth = 0,
}: Omit<Props, 'nodes'> & { node: ArchiveTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className={`flex min-w-0 items-center gap-1 rounded-md pr-1 ${
          selectedFolderId === node.id
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-muted'
        }`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <button
          type="button"
          className="flex size-7 shrink-0 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          disabled={!hasChildren}
          aria-label={
            expanded ? `Contraer ${node.name}` : `Expandir ${node.name}`
          }
          onClick={() => setExpanded(value => !value)}
        >
          {hasChildren &&
            (expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            ))}
        </button>
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {expanded && hasChildren ? (
            <FolderOpen className="size-4 shrink-0 text-warning" />
          ) : (
            <Folder className="size-4 shrink-0 text-warning" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {hasChildren &&
        expanded &&
        node.children.map(child => (
          <Node
            key={child.id}
            node={child}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export function ArchiveFolderTree({
  nodes,
  selectedFolderId,
  onSelect,
}: Props) {
  return (
    <nav
      aria-label="Árbol de carpetas"
      className="max-h-[min(42dvh,40rem)] overflow-auto p-2 lg:max-h-none"
    >
      {nodes.map(node => (
        <Node
          key={node.id}
          node={node}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
        />
      ))}
      {!nodes.length && (
        <p className="px-2 py-4 text-sm text-muted-foreground">
          No hay carpetas aún.
        </p>
      )}
    </nav>
  );
}
