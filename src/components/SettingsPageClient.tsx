"use client";

import { useState, useTransition } from "react";
import {
  archiveCandidate,
  createCandidate,
  deleteCandidate,
  updateCandidate,
} from "@/lib/actions/candidates";
import { updateMemberName } from "@/lib/actions/members";
import { isDiningOutUnknownCandidate } from "@/lib/constants";
import type { MealCategory } from "@/lib/db";
import type { CandidateWithStats } from "@/lib/utils/candidates";

type Props = {
  members: { id: string; name: string }[];
  homeCandidates: CandidateWithStats[];
  diningCandidates: CandidateWithStats[];
};

function shortDate(date: string | null): string {
  if (!date) return "—";
  const [, m, d] = date.split("-");
  return m && d ? `${Number(m)}/${Number(d)}` : date;
}

export function SettingsPageClient({
  members: initialMembers,
  homeCandidates,
  diningCandidates,
}: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [tab, setTab] = useState<MealCategory>("home_cooked");
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newReading, setNewReading] = useState("");

  const candidates = tab === "home_cooked" ? homeCandidates : diningCandidates;

  const saveMember = (id: string, name: string) => {
    startTransition(async () => {
      await updateMemberName(id, name);
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)));
    });
  };

  const addCandidate = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createCandidate({ name: newName, reading: newReading, category: tab });
      setNewName("");
      setNewReading("");
      window.location.reload();
    });
  };

  const saveCandidate = (id: string, name: string, reading: string) => {
    startTransition(async () => {
      await updateCandidate(id, { name, reading });
      window.location.reload();
    });
  };

  const toggleArchive = (id: string, archived: boolean) => {
    startTransition(async () => {
      await archiveCandidate(id, archived);
      window.location.reload();
    });
  };

  const removeCandidate = (id: string) => {
    if (!confirm("この候補を削除しますか？")) return;
    startTransition(async () => {
      try {
        await deleteCandidate(id);
        window.location.reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : "削除できませんでした");
      }
    });
  };

  return (
    <div className="settings-compact space-y-4">
      <section className="card card-compact">
        <h3 className="settings-section-title">メンバー</h3>
        <div className="settings-member-grid">
          {members.map((m) => (
            <MemberEditor key={m.id} member={m} onSave={saveMember} disabled={pending} />
          ))}
        </div>
      </section>

      <section className="card card-compact">
        <div className="settings-toolbar">
          <div className="settings-toolbar-left">
            <h3 className="settings-section-title">候補</h3>
            <span className="settings-count">{candidates.length}件</span>
          </div>
          <div className="segment-group" role="group" aria-label="候補種別">
            <button
              type="button"
              className={`segment-btn ${tab === "home_cooked" ? "segment-btn-on" : ""}`}
              onClick={() => setTab("home_cooked")}
            >
              自炊
            </button>
            <button
              type="button"
              className={`segment-btn ${tab === "dining_out" ? "segment-btn-on" : ""}`}
              onClick={() => setTab("dining_out")}
            >
              外食
            </button>
          </div>
        </div>

        <div className="settings-add-row">
          <input
            className="input input-compact flex-1"
            placeholder="新規名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCandidate()}
          />
          <input
            className="input input-compact settings-add-reading hidden sm:block"
            placeholder="かな"
            value={newReading}
            onChange={(e) => setNewReading(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCandidate()}
          />
          <button
            type="button"
            className="btn btn-primary btn-xs shrink-0"
            onClick={addCandidate}
            disabled={pending || !newName.trim()}
          >
            追加
          </button>
        </div>

        <div className="data-table-wrap data-table-wrap-compact mt-3">
          <table className="data-table data-table-compact">
            <thead>
              <tr>
                <th>名称</th>
                <th className="col-hide-mobile">かな</th>
                <th className="num">回数</th>
                <th className="col-hide-mobile">最終</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted">
                    候補がありません
                  </td>
                </tr>
              )}
              {candidates.map((c) => (
                <CandidateRow
                  key={c.id}
                  candidate={c}
                  onSave={saveCandidate}
                  onArchive={toggleArchive}
                  onDelete={removeCandidate}
                  disabled={pending}
                  locked={isDiningOutUnknownCandidate(c)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="settings-backup meta">
        バックアップ: <code className="text-ink">data/meals.db</code> をコピー（ローカル） /
        Turso 利用時はダッシュボードから
      </p>
    </div>
  );
}

function MemberEditor({
  member,
  onSave,
  disabled,
}: {
  member: { id: string; name: string };
  onSave: (id: string, name: string) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState(member.name);
  const label = member.id === "member_1" ? "1" : "2";
  return (
    <div className="settings-member-row">
      <span className="settings-member-label">M{label}</span>
      <input
        className="input input-compact min-w-0 flex-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label={`メンバー${label}`}
      />
      <button
        type="button"
        className="btn btn-secondary btn-xs shrink-0"
        disabled={disabled}
        onClick={() => onSave(member.id, name)}
      >
        保存
      </button>
    </div>
  );
}

function CandidateRow({
  candidate,
  onSave,
  onArchive,
  onDelete,
  disabled,
  locked,
}: {
  candidate: CandidateWithStats;
  onSave: (id: string, name: string, reading: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
  disabled: boolean;
  locked?: boolean;
}) {
  const [name, setName] = useState(candidate.name);
  const [reading, setReading] = useState(candidate.reading ?? "");

  return (
    <tr className={candidate.isArchived ? "data-table-row-archived" : undefined}>
      <td>
        <input
          className="input input-compact"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={locked}
        />
      </td>
      <td className="col-hide-mobile">
        <input
          className="input input-compact"
          placeholder="—"
          value={reading}
          onChange={(e) => setReading(e.target.value)}
          disabled={locked}
        />
      </td>
      <td className="data-table-cell-num">{candidate.usageCount}</td>
      <td className="data-table-cell-date col-hide-mobile">
        {shortDate(candidate.lastUsedDate)}
      </td>
      <td>
        {locked ? (
          <span className="badge badge-out badge-xs">固定</span>
        ) : (
          <div className="data-table-actions-compact">
            {candidate.isArchived ? (
              <span className="badge badge-other badge-xs">Archive</span>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={disabled}
              onClick={() => onSave(candidate.id, name, reading)}
            >
              保存
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={disabled}
              onClick={() => onArchive(candidate.id, !candidate.isArchived)}
            >
              {candidate.isArchived ? "復帰" : "Archive"}
            </button>
            {candidate.usageCount === 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs text-danger"
                disabled={disabled}
                onClick={() => onDelete(candidate.id)}
              >
                削除
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
