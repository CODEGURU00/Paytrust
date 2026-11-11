import { avatarSrc } from '@/lib/demo/data';
import type { DemoPerson } from '@/lib/demo/types';
import { cn } from '@/lib/utils';

const sizeMap = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
  xl: 'h-16 w-16',
  '2xl': 'h-24 w-24',
};

export function PersonAvatar({
  person,
  size = 'md',
  className,
  ring = false,
}: {
  person: Pick<DemoPerson, 'name' | 'avatar'>;
  size?: keyof typeof sizeMap;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full bg-panel-soft',
        ring && 'ring-2 ring-brand/30 ring-offset-2 ring-offset-panel',
        sizeMap[size],
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarSrc(person.avatar)}
        alt={person.name}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </span>
  );
}

export function AvatarStack({
  people,
  size = 'sm',
  limit = 3,
}: {
  people: Pick<DemoPerson, 'name' | 'avatar'>[];
  size?: keyof typeof sizeMap;
  limit?: number;
}) {
  const visible = people.slice(0, limit);
  const rest = people.length - visible.length;
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((person) => (
        <span
          key={person.name}
          className="rounded-full ring-2 ring-panel"
        >
          <PersonAvatar person={person} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-panel-soft text-[10px] font-semibold text-muted ring-2 ring-panel">
          +{rest}
        </span>
      )}
    </div>
  );
}
