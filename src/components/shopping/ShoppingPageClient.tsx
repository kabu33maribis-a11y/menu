"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  getPurchaseHistories,
  getShoppingBoard,
  type PurchaseHistoryWithItems,
  type ShoppingBoard,
} from "@/lib/actions/shopping";
import { ShoppingHistoryView } from "./ShoppingHistoryView";
import { ShoppingManageView } from "./ShoppingManageView";
import { ShoppingModeView } from "./ShoppingModeView";
import { ShoppingSelectView } from "./ShoppingSelectView";

export type ShoppingMode = "select" | "shop" | "manage" | "history";

const MODES: { id: ShoppingMode; label: string }[] = [
  { id: "select", label: "選ぶ" },
  { id: "shop", label: "買い物" },
  { id: "manage", label: "管理" },
  { id: "history", label: "履歴" },
];

type Props = {
  initialBoard: ShoppingBoard;
  initialHistories: PurchaseHistoryWithItems[];
};

export function ShoppingPageClient({ initialBoard, initialHistories }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<ShoppingMode>("select");
  const [board, setBoard] = useState(initialBoard);
  const [histories, setHistories] = useState(initialHistories);
  const [, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const [nextBoard, nextHistories] = await Promise.all([
        getShoppingBoard(),
        getPurchaseHistories(),
      ]);
      setBoard(nextBoard);
      setHistories(nextHistories);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker mb-1">買い物</p>
        <h2 className="page-title">食材チェックリスト</h2>
      </div>

      <div className="segment-group shopping-mode-tabs" role="tablist" aria-label="買い物モード">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={`segment-btn ${mode === m.id ? "segment-btn-on" : ""}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
            {m.id === "shop" && board.selectedCount > 0 ? (
              <span className="shopping-tab-count">{board.selectedCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      {mode === "select" ? (
        <ShoppingSelectView
          board={board}
          onBoardChange={setBoard}
          onStartShopping={() => setMode("shop")}
          onRefresh={refresh}
        />
      ) : null}

      {mode === "shop" ? (
        <ShoppingModeView
          board={board}
          onBoardChange={setBoard}
          onGoSelect={() => setMode("select")}
          onRefresh={refresh}
          onCompleted={() => {
            refresh();
            setMode("select");
          }}
        />
      ) : null}

      {mode === "manage" ? (
        <ShoppingManageView board={board} onRefresh={refresh} />
      ) : null}

      {mode === "history" ? <ShoppingHistoryView histories={histories} /> : null}
    </div>
  );
}
