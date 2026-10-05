import {
  buildColumnVisibilityMutation,
  buildStatusIconMutation,
  buildStatusVisibilityMutation,
  normalizeTableContract,
} from "./tableLayout";

export function changedProperties(item, draft = {}) {
  return Object.fromEntries(Object.entries(draft).filter(
    ([key, value]) => JSON.stringify(item?.[key]) !== JSON.stringify(value),
  ));
}

/** Save an item's draft using the server response from each preceding write. */
export async function savePresentationChanges({ kind, id, changes, moduleKey, viewKey, readContract, writeProperty }) {
  let contract = await readContract();
  const builders = kind === "column"
    ? { visible: buildColumnVisibilityMutation }
    : { visible: buildStatusVisibilityMutation, icon: buildStatusIconMutation };
  for (const [property, value] of Object.entries(changes)) {
    const current = normalizeTableContract(contract, { moduleKey, viewKey });
    const target = kind === "column"
      ? current?.columns.find((item) => item.accessor === id)
      : current?.statuses.find((item) => item.key === id);
    if (!target) throw new Error("This item is no longer available. Reload the view.");
    if (!builders[property]) continue;
    if (!Object.keys(changedProperties(target, { [property]: value })).length) continue;
    if (!target.presentation?.[property]?.writable) {
      throw new Error(`The ${property} setting cannot be changed for this item.`);
    }
    const result = await writeProperty({ mutation: builders[property](target, value), moduleKey, viewKey });
    contract = result.contract;
  }
  return contract;
}
