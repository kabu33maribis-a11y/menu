"use client";

import { useRouter } from "next/navigation";
import { useRef, type PointerEvent, type ReactNode } from "react";

type Props = {
  prevHref: string;
  nextHref: string;
  children: ReactNode;
};

const LOCK_PX = 10;
const DISTANCE_PX = 56;
const VELOCITY_PX_MS = 0.45;
const AXIS_RATIO = 1.15;

export function CalendarSwipeNav({ prevHref, nextHref, children }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startT = useRef(0);
  const tracking = useRef(false);
  const axis = useRef<"undecided" | "x" | "y">("undecided");
  const consumed = useRef(false);
  const pointerId = useRef<number | null>(null);

  const snapBack = () => {
    const el = rootRef.current;
    if (!el) return;
    el.style.transition = "transform 180ms ease-out";
    el.style.transform = "";
  };

  const clearTracking = () => {
    tracking.current = false;
    axis.current = "undecided";
    pointerId.current = null;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (document.querySelector('[role="dialog"]')) return;
    tracking.current = true;
    axis.current = "undecided";
    consumed.current = false;
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startT.current = e.timeStamp;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!tracking.current || pointerId.current !== e.pointerId) return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (axis.current === "undecided") {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
      axis.current = Math.abs(dx) > Math.abs(dy) * AXIS_RATIO ? "x" : "y";
      if (axis.current === "y") {
        clearTracking();
        return;
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* capture is optional */
      }
    }

    if (axis.current !== "x") return;

    const el = rootRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.transform = `translate3d(${dx * 0.28}px, 0, 0)`;
    }
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (!tracking.current || pointerId.current !== e.pointerId) return;

    const dx = e.clientX - startX.current;
    const dt = Math.max(1, e.timeStamp - startT.current);
    const vx = dx / dt;
    const shouldGo =
      axis.current === "x" &&
      (Math.abs(dx) >= DISTANCE_PX || Math.abs(vx) >= VELOCITY_PX_MS);

    if (shouldGo) {
      consumed.current = true;
      const el = rootRef.current;
      if (el) {
        el.style.transition = "transform 160ms ease-out, opacity 160ms ease-out";
        el.style.transform = `translate3d(${dx > 0 ? 18 : -18}%, 0, 0)`;
        el.style.opacity = "0.55";
      }
      router.push(dx > 0 ? prevHref : nextHref);
    } else if (axis.current === "x") {
      snapBack();
    }

    clearTracking();
  };

  return (
    <div
      ref={rootRef}
      className="cal-swipe-root"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={(e) => {
        if (pointerId.current !== e.pointerId) return;
        snapBack();
        clearTracking();
      }}
      onClickCapture={(e) => {
        if (!consumed.current) return;
        e.preventDefault();
        e.stopPropagation();
        consumed.current = false;
      }}
    >
      {children}
    </div>
  );
}
