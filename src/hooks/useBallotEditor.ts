"use client";
import { useCallback, useMemo, useState } from "react";

import { Allocation } from "./useBallot";
import { createSortFn, useMetrics } from "./useMetrics";
import { useBallotFilter } from "./useFilter";
import { useBallotContext } from "@/components/ballot/provider";

export type BallotState = Record<
  string,
  { allocation: number; locked: boolean }
>;

export function useBallotEditor({
  onAdd,
  onRemove,
  onUpdate,
}: {
  onAdd?: (id: string) => void;
  onRemove?: (id: string) => void;
  onUpdate?: (allocation: Allocation, state: BallotState) => void;
}) {
  const [state, setState] = useState<BallotState>({});

  const setInitialState = useCallback(
    (allocations: Allocation[] = []) => {
      const ballot: BallotState = Object.fromEntries(
        allocations.map((m) => [
          m.metric_id,
          { allocation: m.allocation, locked: Boolean(m.locked) },
        ])
      );
      setState(ballot);
    },
    [setState]
  );

  const set = (
    id: string,
    amount: number = state[id].allocation,
    unlock: boolean = false
  ) => {
    setState((s) => {
      // Must be between 0 - 100
      const allocation = Math.max(Math.min(amount, 100), 0);
      const locked = !unlock;
      const _state = calculateBalancedAmounts({
        ...s,
        [id]: { ...s[id], allocation, locked },
      });

      onUpdate?.({ ..._state[id], metric_id: id }, _state);

      return _state;
    });
  };
  const inc = (id: string) => set(id, (state[id]?.allocation ?? 0) + 5);
  const dec = (id: string) => set(id, (state[id]?.allocation ?? 0) - 5);
  const add = (id: string, allocation = 0) => {
    set(id, allocation);
    onAdd?.(id);
  };
  const remove = (id: string) =>
    setState((s) => {
      const { [id]: _remove, ..._state } = s;
      onRemove?.(id);
      return calculateBalancedAmounts(_state);
    });
  const reset = setInitialState;

  return { set, inc, dec, add, remove, reset, state };
}

function calculateBalancedAmounts(state: BallotState): BallotState {
  // Autobalance non-locked fields
  const locked = Object.entries(state).filter(([_, m]) => m.locked);
  const nonLocked = Object.entries(state).filter(([_, m]) => !m.locked);

  const amountToBalance =
    100 - locked.reduce((sum, [_, m]) => sum + m.allocation, 0);

  return Object.fromEntries(
    Object.entries(state).map(([id, { allocation, locked }]) => [
      id,
      {
        allocation: locked
          ? allocation
          : amountToBalance
          ? amountToBalance / nonLocked.length
          : 0,
        locked,
      },
    ])
  );
}

export function useSortBallot(initialState: BallotState) {
  const { state } = useBallotContext();
  const { data: metrics, isPending } = useMetrics();
  const [filter, setFilter] = useBallotFilter();

  const sorted = useMemo(
    () =>
      metrics
        ?.map((m) => ({ ...m, ...state[m.metric_id] }))
        .sort(createSortFn({ order: filter.order, sort: filter.sort }))
        .map((m) => m?.metric_id ?? "")
        .filter(Boolean) ?? [],
    [filter, metrics] // Don't put state here because we don't want to sort when allocation changes
  );

  return {
    filter,
    sorted,
    isPending,
    setFilter,
  };
}
