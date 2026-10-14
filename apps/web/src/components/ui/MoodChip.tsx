const moodClass: Record<string, string> = {
  happy: 'bg-mood-happy-bg text-mood-happy-text',
  calm: 'bg-mood-calm-bg text-mood-calm-text',
  sad: 'bg-mood-sad-bg text-mood-sad-text',
  motivated: 'bg-mood-motivated-bg text-mood-motivated-text',
  curious: 'bg-mood-curious-bg text-mood-curious-text',
  romantic: 'bg-mood-romantic-bg text-mood-romantic-text',
  lonely: 'bg-mood-lonely-bg text-mood-lonely-text',
  stressed: 'bg-mood-stressed-bg text-mood-stressed-text',
  adventurous: 'bg-mood-adventurous-bg text-mood-adventurous-text',
  focused: 'bg-mood-focused-bg text-mood-focused-text',
};

export function MoodChip({ mood, label }: { mood: keyof typeof moodClass; label: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${moodClass[mood]}`}>
      {label}
    </span>
  );
}
