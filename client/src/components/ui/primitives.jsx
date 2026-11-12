import * as Dialog from '@radix-ui/react-dialog';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export function cn(...parts) { return twMerge(clsx(parts)); }

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-ocean-800 text-white hover:bg-ocean-700',
        kelp: 'bg-kelp-700 text-white hover:bg-kelp-600',
        ghost: 'bg-transparent text-ocean-900 hover:bg-ocean-50',
        outline: 'border border-ocean-900/15 bg-white text-ocean-900 hover:border-ocean-800',
        danger: 'bg-red-700 text-white hover:bg-red-800',
      },
      size: { sm: 'h-9 px-3', md: 'h-11 px-5', icon: 'h-10 w-10 px-0' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export function Button({ className, variant, size, asChild, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-ocean-950">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-ocean-900/60">{hint}</span> : null}
    </label>
  );
}

export function Badge({ children, tone = 'ocean' }) {
  const tones = {
    ocean: 'bg-ocean-50 text-ocean-800',
    kelp: 'bg-kelp-50 text-kelp-700',
    sand: 'bg-sand text-ocean-900',
    red: 'bg-red-50 text-red-700',
  };
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', tones[tone])}>{children}</span>;
}

export function Modal({ open, onOpenChange, title, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ocean-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(640px,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-card">
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-2xl text-ocean-950">{title}</Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-sand" aria-label="Close"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Sheet({ open, onOpenChange, title, side = 'right', children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ocean-950/40" />
        <Dialog.Content className={cn(
          'fixed inset-y-0 z-50 flex h-dvh w-[min(420px,100%)] flex-col bg-white shadow-card',
          side === 'left' ? 'left-0' : 'right-0',
        )}>
          <div className="flex items-center justify-between border-b border-ocean-900/10 px-5 py-4">
            <Dialog.Title className="font-display text-xl">{title}</Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-sand" aria-label="Close"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Menu({ trigger, children }) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="z-50 min-w-44 rounded-2xl border border-ocean-900/10 bg-white p-1 shadow-card" align="end" sideOffset={8}>
          {children}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

export function MenuItem({ children, ...props }) {
  return <Dropdown.Item className="cursor-pointer rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-sand" {...props}>{children}</Dropdown.Item>;
}

export function Empty({ title, body, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-ocean-900/20 bg-sand/60 px-6 py-14 text-center">
      <h2 className="font-display text-2xl text-ocean-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ocean-900/70">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Spinner() {
  return <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-ocean-100 border-t-ocean-700" role="status" aria-label="Loading" />;
}

export function Notice({ tone = 'error', children }) {
  return <p className={cn('rounded-2xl px-4 py-3 text-sm', tone === 'error' ? 'bg-red-50 text-red-800' : 'bg-kelp-50 text-kelp-700')}>{children}</p>;
}
