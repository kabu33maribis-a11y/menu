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
    <div className="space-y-16">
      <section>
        <p className="kicker mb-2">名前</p>
        <h3 className="section-title mb-8">メンバー</h3>
        <div className="max-w-xl space-y-8">
          {members.map((m) => (
            <MemberEditor key={m.id} member={m} onSave={saveMember} disabled={pending} />
          ))}
        </div>
      </section>

      <section className="rule pt-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker mb-2">マスタ</p>
            <h3 className="section-title">候補</h3>
          </div>
          <div className="flex gap-6">
            <button
              type="button"
              className={`choice ${tab === "home_cooked" ? "choice-on" : ""}`}
              onClick={() => setTab("home_cooked")}
            >
              自炊
            </button>
            <button
              type="button"
              className={`choice ${tab === "dining_out" ? "choice-on" : ""}`}
              onClick={() => setTab("dining_out")}
            >
              外食
            </button>
          </div>
        </div>

        <div className="mb-10 grid max-w-xl gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <input
            className="input"
            placeholder="名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="input"
            placeholder="かな読み（任意）"
            value={newReading}
            onChange={(e) => setNewReading(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={addCandidate} disabled={pending}>
            追加
          </button>
        </div>

        <div className="divide-y divide-line">
          {candidates.length === 0 && <p className="py-5 text-sm text-muted">候補がありません</p>}
          {candidates.map((c) => (
            <CandidateEditor
              key={c.id}
              candidate={c}
              onSave={saveCandidate}
              onArchive={toggleArchive}
              onDelete={removeCandidate}
              disabled={pending}
              locked={isDiningOutUnknownCandidate(c)}
            />
          ))}
        </div>
      </section>

      <section className="rule pt-10">
        <p className="kicker mb-2">データ</p>
        <h3 className="section-title mb-4">バックアップ</h3>
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          データは <span className="text-ink">data/meals.db</span> に保存されています。このファイルをコピーすればバックアップできます。
        </p>
      </section>
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
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex-1">
        <label className="label">{member.id === "member_1" ? "メンバー1" : "メンバー2"}</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={disabled}
        onClick={() => onSave(member.id, name)}
      >
        保存
      </button>
    </div>
  );
}

function CandidateEditor({
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
    <div className="py-6">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={locked}
        />
        <input
          className="input"
          placeholder="かな読み"
          value={reading}
          onChange={(e) => setReading(e.target.value)}
          disabled={locked}
        />
      </div>
      <p className="meta mt-2">
        使用 {candidate.usageCount} 回
        {candidate.lastUsedDate ? ` · 最終 ${candidate.lastUsedDate}` : " · 未使用"}
        {candidate.isArchived ? " · アーカイブ中" : ""}
        {locked ? " · 店名を覚えていないとき用（変更・削除できません）" : ""}
      </p>
      {!locked && (
        <div className="mt-3 flex flex-wrap gap-4">
          <button
            type="button"
            className="btn btn-secondary text-xs"
            disabled={disabled}
            onClick={() => onSave(candidate.id, name, reading)}
          >
            保存
          </button>
          <button
            type="button"
            className="btn btn-secondary text-xs"
            disabled={disabled}
            onClick={() => onArchive(candidate.id, !candidate.isArchived)}
          >
            {candidate.isArchived ? "復帰" : "アーカイブ"}
          </button>
          {candidate.usageCount === 0 && (
            <button
              type="button"
              className="btn btn-danger text-xs"
              disabled={disabled}
              onClick={() => onDelete(candidate.id)}
            >
              削除
            </button>
          )}
        </div>
      )}
    </div>
  );
}
