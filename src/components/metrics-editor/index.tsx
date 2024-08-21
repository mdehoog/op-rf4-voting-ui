"use client";
import { NumericFormat } from "react-number-format";
import { InfoIcon, Minus, Plus, Trash2 } from "lucide-react";
import { Heading } from "@/components/ui/headings";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useBallotContext } from "../ballot/provider";
import { useSortBallot } from "@/hooks/useBallotEditor";
import { BallotFilter } from "../ballot/ballot-filter";
import { Metric } from "@/hooks/useMetrics";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";
import mixpanel from "@/lib/mixpanel";
import { DistributionChart } from "../metrics/distribution-chart";
import { Card } from "../ui/card";

export function MetricsEditor({
  metrics = [],
  isLoading,
  onAllocationMethodSelect,
}: {
  metrics?: Metric[];
  isLoading: boolean;
  onAllocationMethodSelect: (data: { x: number; y: number }[]) => void;
}) {
  const { state, inc, dec, set, remove } = useBallotContext();

  const { sorted } = useSortBallot(state);

  const count = useMemo(() => Object.keys(state).length, [state]);
  const metricById = useMemo(
    () => Object.fromEntries(metrics.map((m) => [m["metric_id"], m])),
    [metrics]
  );

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // Dummy data for the allocation methods
  const allocationMethods = [
    {
      data: [
        {x: 0, y: 340},
        {x: 10, y: 340},
        {x: 10, y: 255},
        {x: 20, y: 255},
        {x: 20, y: 170},
        {x: 30, y: 170},
        {x: 30, y: 85},
        {x: 40, y: 85},
        {x: 40, y: 0},
        {x: 50, y: 0},
      ],
      formatChartTick: (tick: number) => `${tick}k`,
      method: "Impact groups",
      description: "blah blah blah",
    },
    {
      data: [
        {x: 0, y: 340},
        {x: 10, y: 255},
        {x: 20, y: 170},
        {x: 30, y: 85},
        {x: 40, y: 0},
      ],
      formatChartTick: (tick: number) => `${tick}k`,
      method: "Top to bottom",
      description: "blah blah blah",
    },
    {
      data: [
        {x: 0, y: 400},
        {x: 10, y: 100},
        {x: 20, y: 50},
        {x: 30, y: 30},
        {x: 40, y: 20},
      ],
      formatChartTick: (tick: number) => `${tick}k`,
      method: "Top weighted",
      description: "blah blah blah",
    },
    {
      data: [],
      formatChartTick: (tick: number) => `--k`,
      method: "Custom",
      description: "blah blah blah",
    },
  ]
  const allocationAmount = "3,333,333";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="mb-4">
          <Heading variant={"h3"}>Your ballot</Heading>
          <div className="text-sm">
            You&apos;ve added {count} of {metrics.length} metrics
          </div>
        </div>
        <BallotFilter />
      </div>

      {/* This sections is a work in progress */}
      <div className=" flex flex-col gap-4 py-4 text-sm">
        <p>First, review your project rankings in the list below.</p>
        <p>Then, choose a method to easily allocate rewards across prjects. You can also customize percentages at any time.</p>
        <p>OP calcilations in this ballot are based on your budget of {allocationAmount} OP</p>
      </div>

      <div className="flex flex-row justify-between items-end">
        <p className="font-semibold mb-2">Allocation method</p>
        <p className="font-semibold mb-2 text-sm">None selected</p>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-1 md:grid-cols-2 gap-2 mb-4">
        {allocationMethods.map((method, index) => (
          <Card
            key={index}
            className={cn("cursor-pointer", {
              "border-2 border-blue-500": selectedMethod === method.method
            })}
            onClick={() => {
              setSelectedMethod(method.method);
              onAllocationMethodSelect(method.data);
            }}
          >
            <DistributionChart data={method.data} formatChartTick={method.formatChartTick} />
            <div className="mb-2 mx-4 flex flex-row justify-between items-center">
              <p className="font-bold text-sm">{method.method}</p>
              <InfoIcon className="h-4 w-4" />
            </div>
          </Card>
        ))}
      </div>
      {/* ^^This sections is a work in progress^^ */}

      <div className="divide-y border-y">
        {isLoading &&
          Array(3)
            .fill(0)
            .map((_, i) => (
              <div className="py-4" key={i}>
                <Skeleton key={i} className="h-10" />
              </div>
            ))}
        {sorted
          .filter((id) => state[id])
          .map((id) => {
            const { allocation, locked } = state[id];
            const { name } = metricById[id] ?? {};

            console.log(id, allocation);
            return (
              <div key={id} className="py-4 flex justify-between items-center">
                <h3 className="font-medium text-sm hover:underline underline-offset-4">
                  <Link href={`/metrics/${id}`}>{name}</Link>
                </h3>
                <div className="flex gap-2">
                  <Button
                    size={"icon"}
                    variant={locked ? "secondary" : "ghost"}
                    icon={locked ? LockFillLocked : LockFillUnlocked}
                    className={cn({ ["opacity-50"]: !locked })}
                    tabIndex={-1}
                    onClick={() => {
                      set(id, allocation, locked);
                      mixpanel.track("Lock Metric", { id, allocation });
                    }}
                  />
                  <div className="flex border rounded-lg">
                    <Button
                      size={"icon"}
                      variant="ghost"
                      icon={Minus}
                      tabIndex={-1}
                      disabled={allocation <= 0}
                      onClick={() => {
                        dec(id);
                        mixpanel.track("Decrease Metric", { id, allocation });
                      }}
                    />
                    <NumericFormat
                      min={0}
                      max={100}
                      suffix={"%"}
                      allowNegative={false}
                      allowLeadingZeros={false}
                      isAllowed={(values) => (values?.floatValue ?? 0) <= 100}
                      customInput={(p) => (
                        <input
                          className="w-16 text-center"
                          {...p}
                          max={100}
                          min={0}
                        />
                      )}
                      placeholder="--%"
                      value={
                        allocation !== undefined
                          ? allocation.toFixed(2)
                          : undefined
                      }
                      onBlur={(e) => {
                        e.preventDefault();
                        const updated = parseFloat(e.target.value);
                        allocation !== updated && set(id, updated);
                        mixpanel.track("Update Metric", {
                          id,
                          allocation: updated,
                        });
                      }}
                    />
                    <Button
                      size={"icon"}
                      variant="ghost"
                      icon={Plus}
                      tabIndex={-1}
                      disabled={allocation >= 100}
                      onClick={() => {
                        inc(id);
                        mixpanel.track("Increase Metric", { id, allocation });
                      }}
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    icon={Trash2}
                    tabIndex={-1}
                    onClick={() => {
                      remove(id);
                      mixpanel.track("Remove Metric", { id });
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

const LockFillLocked = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12.6667 6.66732H13.3333C13.7015 6.66732 14 6.96578 14 7.33398V14.0007C14 14.3689 13.7015 14.6673 13.3333 14.6673H2.66667C2.29848 14.6673 2 14.3689 2 14.0007V7.33398C2 6.96578 2.29848 6.66732 2.66667 6.66732H3.33333V6.00065C3.33333 3.42332 5.42267 1.33398 8 1.33398C10.5773 1.33398 12.6667 3.42332 12.6667 6.00065V6.66732ZM11.3333 6.66732V6.00065C11.3333 4.1597 9.84093 2.66732 8 2.66732C6.15905 2.66732 4.66667 4.1597 4.66667 6.00065V6.66732H11.3333ZM7.33333 9.33398V12.0007H8.66667V9.33398H7.33333Z"
      fill="currentColor"
    />
  </svg>
);

const LockFillUnlocked = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4.66667 6.66732H13.3333C13.7015 6.66732 14 6.96578 14 7.33398V14.0007C14 14.3689 13.7015 14.6673 13.3333 14.6673H2.66667C2.29848 14.6673 2 14.3689 2 14.0007V7.33398C2 6.96578 2.29848 6.66732 2.66667 6.66732H3.33333V6.00065C3.33333 3.42332 5.42267 1.33398 8 1.33398C9.827 1.33398 11.4087 2.38385 12.1749 3.9132L10.9821 4.50961C10.4348 3.41722 9.305 2.66732 8 2.66732C6.15905 2.66732 4.66667 4.1597 4.66667 6.00065V6.66732ZM6.66667 10.0007V11.334H9.33333V10.0007H6.66667Z"
      fill="currentColor"
    />
  </svg>
);