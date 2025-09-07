/**
 * Formats a timestamp for display in chat interfaces
 * @param timestamp - The timestamp to format (string, Date, or undefined)
 * @returns Formatted timestamp string
 * 
 * Format rules:
 * - Today's messages: Show time in 12-hour format with AM/PM (e.g., "2:30 PM")
 * - Yesterday's messages: Show "Yesterday"
 * - Older messages: Show date (e.g., "12/25/2023")
 */
export const formatTimestamp = (timestamp: string | Date | undefined): string => {
  if (!timestamp) return '';
  
  const messageDate = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  
  // If message was sent today, show time
  if (messageDay.getTime() === today.getTime()) {
    return messageDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  // If message was sent yesterday, show "Yesterday"
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  
  // For older messages, show date
  return messageDate.toLocaleDateString();
};
