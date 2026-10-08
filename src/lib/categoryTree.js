/**
 * Category tree helpers.
 *
 * `Category` is a self-referencing model (`parentId` -> `parent`), so the
 * storefront only ever consumes two levels: a parent column plus its direct
 * children. Prisma returns a flat list; these helpers fold that list into the
 * nested shape the header mega-menu and the mobile drawer both render, so the
 * grouping logic lives in one place instead of being copy-pasted per consumer.
 *
 * Rows whose `parentId` points at a category that is not in the same result set
 * are treated as roots rather than being dropped — an orphaned subcategory is
 * still shoppable and should still be reachable from the menu.
 *
 * @typedef {{ id: string, name: string, slug: string, parentId?: string | null }} CategoryRow
 * @typedef {{ id: string, name: string, slug: string, parentId: string | null, children: CategoryRow[] }} CategoryNode
 */

/**
 * Fold a flat category list into roots, each carrying its direct children.
 * Purely a grouping pass — no I/O — so it is safe to call from either a server
 * component or a client component that received rows via props.
 *
 * @param {CategoryRow[]} rows
 * @returns {CategoryNode[]}
 */
export function buildCategoryTree(rows = []) {
  const nodes = new Map();

  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId ?? null,
      children: [],
    });
  }

  const roots = [];

  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : null;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Alphabetise children so the mega-menu columns read predictably regardless of
  // the order the parent rows were fetched in.
  for (const root of roots) {
    root.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  return roots;
}

/**
 * Serialisable shape for the client components — drops the redundant
 * `parentId` back-reference that only exists to wire up the grouping above.
 *
 * @param {CategoryRow[]} rows
 * @returns {{ id: string, name: string, slug: string, children: { id: string, name: string, slug: string }[] }[]}
 */
export function buildCategoryTreeForMenu(rows = []) {
  return buildCategoryTree(rows).map((root) => ({
    id: root.id,
    name: root.name,
    slug: root.slug,
    children: root.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
    })),
  }));
}