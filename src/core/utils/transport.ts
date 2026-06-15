export type TransportType = "flight" | "train" | "ferry" | "bus" | "cable-car" | "drive";

export const TRANSPORT_EMOJI: Record<TransportType, string> = {
  flight: "✈️", train: "🚂", ferry: "⛴️", bus: "🚌", "cable-car": "🚡", drive: "🚗",
};

export function detectTransport(method: string): TransportType {
  const m = method.toLowerCase();
  if (m.includes("flight") || m.includes("fly")) return "flight";
  if (m.includes("rail") || m.includes("train")) return "train";
  if (m.includes("ferry") || m.includes("fjord") || m.includes("cruise") || m.includes("boat")) return "ferry";
  if (m.includes("cable")) return "cable-car";
  if (m.includes("bus") || m.includes("shuttle") || m.includes("express")) return "bus";
  return "drive";
}
