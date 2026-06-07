import type { Awaitable } from "./types.js";

export async function sleep(ms: number): Promise<void> {
  await Bun.sleep(ms);
}

export async function parallel<T>(tasks: (() => Awaitable<T>)[]): Promise<T[]> {
  return Promise.all(tasks.map((task) => task()));
}
