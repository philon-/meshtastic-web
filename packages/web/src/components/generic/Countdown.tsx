import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export interface CountdownProps {
  target: number | Date;
  onUpdate?: (secondsLeft: number) => void;
  onEnd?: () => void;
  className?: string;
}

const secondsLeft = (targetMs: number, nowMs: number): number =>
  Math.max(0, Math.ceil((targetMs - nowMs) / 1000));

export function Countdown({
  target,
  onUpdate,
  onEnd,
  className,
}: CountdownProps) {
  const { t } = useTranslation();
  const targetMs = useMemo(() => new Date(target).getTime(), [target]);

  const [secs, setSecs] = useState<number>(() =>
    secondsLeft(targetMs, Date.now()),
  );
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // cancel any previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }

    const tick = () => {
      const now = Date.now();
      const remaining = secondsLeft(targetMs, now);
      setSecs(remaining);

      if (remaining === 0) {
        onEnd?.();
        return;
      }

      onUpdate?.(remaining);

      const nextWholeSec = remaining * 1000; // ms remaining rounded up to full sec
      const delay = targetMs - now - (nextWholeSec - 1000); // remainder within this second
      timerRef.current = globalThis.setTimeout(tick, Math.max(1, delay));
    };

    // Align immediately, then self-schedule.
    tick();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = undefined;
    };
  }, [targetMs, onEnd, onUpdate]);

  return (
    <time
      dateTime={new Date(targetMs).toISOString()}
      aria-live="polite"
      aria-atomic="true"
      className={className}
    >
      {secs} {secs === 1 ? t("unit.second.one") : t("unit.second.plural")}
    </time>
  );
}
