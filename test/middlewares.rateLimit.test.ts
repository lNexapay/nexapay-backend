import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "../src/middlewares/rateLimit";

const call = (limiter: ReturnType<typeof createRateLimiter>, user: string) => {
  const next = vi.fn();
  limiter({} as any, { locals: { userId: user } } as any, next);
  return next.mock.calls[0]?.[0] as { statusCode?: number } | undefined;
};

describe("createRateLimiter", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const make = () =>
    createRateLimiter({
      windowMs: 1000,
      max: 2,
      keyOf: (_req, res) => res.locals.userId,
    });

  it("deja pasar hasta el máximo y luego responde 429", () => {
    const limiter = make();

    expect(call(limiter, "a")).toBeUndefined();
    expect(call(limiter, "a")).toBeUndefined();
    expect(call(limiter, "a")?.statusCode).toBe(429);
  });

  it("cuenta cada usuario por separado", () => {
    const limiter = make();

    call(limiter, "a");
    call(limiter, "a");

    expect(call(limiter, "b")).toBeUndefined();
  });

  it("vuelve a permitir consultas cuando termina la ventana", () => {
    const limiter = make();

    call(limiter, "a");
    call(limiter, "a");
    expect(call(limiter, "a")?.statusCode).toBe(429);

    vi.advanceTimersByTime(1001);

    expect(call(limiter, "a")).toBeUndefined();
  });
});
