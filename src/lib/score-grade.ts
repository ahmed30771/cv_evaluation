/** Letter grade similar to Enhancv-style Fix Resume badge. */
export function scoreToGrade(overall: number): string {
  if (overall >= 93) return "A+";
  if (overall >= 88) return "A";
  if (overall >= 83) return "A-";
  if (overall >= 78) return "B+";
  if (overall >= 73) return "B";
  if (overall >= 68) return "B-";
  if (overall >= 63) return "C+";
  if (overall >= 58) return "C";
  if (overall >= 50) return "C-";
  return "D";
}
