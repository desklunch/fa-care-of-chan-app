import { differenceInMinutes, differenceInHours, differenceInDays, differenceInMonths, differenceInYears } from "date-fns";

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  
  const minutes = differenceInMinutes(now, date);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h ago`;
  
  const days = differenceInDays(now, date);
  if (days < 30) return `${days}d ago`;
  
  const months = differenceInMonths(now, date);
  if (months < 12) return `${months}mo ago`;
  
  const years = differenceInYears(now, date);
  return `${years}y ago`;
}
